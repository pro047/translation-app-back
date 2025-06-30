const speech = require("@google-cloud/speech");
const { spawn } = require("child_process");
const {
  getYoutubeAudioStreamUrl,
} = require("../streaming/getYoutubeAudioStreamUrl");
const { TranscriptManager } = require("../transcript/transcriptManager");
const statLogger = require("../statLogger");
const { once } = require("events");

class StreamingSession {
  constructor({ sessionId, youtubeUrl, ws, pushToClient }) {
    this.sessionId = sessionId;
    this.youtubeUrl = youtubeUrl;
    this.ws = ws;
    this.speechClient = new speech.SpeechClient();
    this.transcriptManager = new TranscriptManager(pushToClient);
    this.ffmpegProcess = null;
    this.recognizeStream = null;
    this.isStarted = false;
    this.isStopped = false;
    this.queue = [];
    this.MAX_QUEUE_SIZE = 200;
    this.lastFfmpegDateAt = Date.now();
    this.noDataTimeout = 20000;
    this.noDataTimer = null;
    this.restartCount = 0;
    this.lastRestartAt = 0;
    this.pcmBuffer = Buffer.alloc(0);
  }

  async start() {
    if (this.isStarted) {
      console.log(`this session ${this.sessionId} is already started`);
      return;
    }

    if (this.recognizeStream) {
      try {
        this.recognizeStream.end();
        this.recognizeStream.removeAllListeners();
        this.recognizeStream = null;
      } catch (err) {
        console.warn("‼️ recognizeStream end error :", err);
      }
    }
    this.isStarted = true;
    this.isStopped = false;

    const request = {
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: 16000,
        languageCode: "ko-KR",
        enableAutomaticPunctuation: true,
        useEnhanced: true,
        model: "latest_long",
      },
      interimResults: true,
      singleUtterance: false,
    };

    this.recognizeStream = this.speechClient
      .streamingRecognize(request)
      .on("data", (data) => {
        statLogger.addSttEvent();
        if (data.results[0]?.alternatives[0]) {
          const transcript = data.results[0].alternatives[0].transcript;
          console.log("✅ this.recognizeStream data :", transcript);

          const isFinal = data.results[0].isFinal;

          this.transcriptManager.onTranscript(transcript, isFinal);
        }
      })
      .on("error", (err) => this.handleError(err))
      .on("end", () => this.handleEnd());

    await this.startYoutubeStream();

    this.startFlushLoop();
  }

  handleError(err) {
    console.error(`‼️ STT error : ${err.message}`);
    this.ws?.send(JSON.stringify({ error: err.message }));
    this.restart();
  }

  handleEnd() {
    console.log(`❌ STT ended ${this.sessionId}`);
    this.stop();
  }

  async stop() {
    if (this.isStopped) return;
    this.isStarted = false;
    this.isStopped = true;

    this.queue = [];

    if (this.recognizeStream)
      try {
        this.recognizeStream.end();
        this.recognizeStream.removeAllListeners();
        this.recognizeStream = null;
      } catch (err) {
        console.warn("❌ recognizeStream end error :", err);
      }

    if (this.ffmpegProcess) {
      try {
        this.ffmpegProcess.kill("SIGKILL");
        this.ffmpegProcess.removeAllListeners();
        this.ffmpegProcess = null;
      } catch (err) {
        console.warn("❌ ffmepgProcess kill error :", err);
      }
    }

    if (this.noDataTimer) {
      clearInterval(this.noDataTimer);
      this.noDataTimer = null;
    }

    if (this.transcriptManager && this.transcriptManager.timeout) {
      clearTimeout(this.transcriptManager.timeout);
      this.transcriptManager.timeout = null;
    }
  }

  async restart() {
    await this.stop();
    setTimeout(() => this.start(), 100);
  }

  async startYoutubeStream() {
    const streamUrl = await getYoutubeAudioStreamUrl(this.youtubeUrl);

    try {
      console.log(`👌 Final stream URL: ${streamUrl}`);

      this.ffmpegProcess = spawn("ffmpeg", [
        "-re",
        "-loglevel",
        "debug",
        "-i",
        streamUrl,
        "-vn",
        "-strict",
        "-2",
        "-f",
        "s16le",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        "-rtbufsize",
        "512k",
        "-",
      ]);

      if (!this.ffmpegProcess || !this.ffmpegProcess.stdout) {
        console.error("ffmpeg spwn failed");
        return;
      } else {
        console.log("🎬 ffmpeg start");
      }

      this.ffmpegProcess.stdout.on("data", (chunk) => {
        statLogger.addFfmepg(chunk.length);
        this.lastFfmpegDateAt = Date.now();
        if (this.queue.length > this.MAX_QUEUE_SIZE) {
          this.queue.shift();
        }
        this.queue.push(chunk);
      });

      this.ffmpegProcess.on("error", (err) => {
        console.error("ffmpeg error :", err);
        this.handleError(err);
      });

      this.ffmpegProcess.on("close", (code) => {
        console.log(`ffmpeg process exited with code ${code}`);
        if (this.recognizeStream) {
          this.recognizeStream.end();
          this.recognizeStream = null;
        }
      });

      if (this.noDataTimer) clearInterval(this.noDataTimer);
      this.noDataTimer = setInterval(() => {
        if (Date.now() - this.lastFfmpegDateAt > this.noDataTimeout) {
          console.warn(
            "[warn] no audio data from ffmpeg for a while. Restart.."
          );
          this.restartFfmepg();
        }
      }, 1000);
    } catch (err) {
      console.error(`Failed to start youtube stream: ${err}`);
    }
  }

  restartFfmepg() {
    const now = Date.now();
    if (now - this.lastRestartAt < 60000) {
      this.restartCount++;
      if (this.restartCount > 5) {
        console.warn("[warn] ffmpeg restart too frequent sleeping...");
        setTimeout(() => (this.restartCount = 0), 60000);
        return;
      }
    } else {
      this.restartCount = 0;
    }
    this.lastRestartAt = now;

    try {
      if (this.ffmpegProcess) {
        this.ffmpegProcess.kill("SIGKILL");
        this.ffmpegProcess.removeAllListeners();
        this.ffmpegProcess = null;
      }
    } catch (err) {
      console.warn("ffmpeg kill err", err);
    }
    this.startYoutubeStream();
  }

  startFlushLoop() {
    const CHUNK_SIZE = 3200;

    const writeLoop = async () => {
      while (!this.isStopped) {
        while (this.queue.length > 0) {
          this.pcmBuffer = Buffer.concat([this.pcmBuffer, this.queue.shift()]);
        }

        if (this.pcmBuffer.length >= CHUNK_SIZE && this.recognizeStream) {
          const chunk = this.pcmBuffer.subarray(0, CHUNK_SIZE);
          this.pcmBuffer = this.pcmBuffer.subarray(CHUNK_SIZE);

          const canWrite = this.recognizeStream.write(chunk);
          if (!canWrite) {
            console.warn(
              "‼️ recognizeStream write blocked, waiting for drain..."
            );
            await once(this.recognizeStream, "drain");
          }
        } else {
          if (this.recognizeStream && this.pcmBuffer.length == 0) {
            const silenceChunk = Buffer.alloc(CHUNK_SIZE, 0);
            this.recognizeStream.write(silenceChunk);
            console.log("[warn] silence chunk sent");
          }

          await new Promise((res) => setTimeout(res, 100));
        }
      }
    };

    writeLoop();
  }
}

module.exports = { StreamingSession };
