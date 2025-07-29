const speech = require("@google-cloud/speech");
const { initSttStream } = require("../streaming/initSttStream");
const { startYoutubeStream } = require("../streaming/startYoutubeStream");
const {
  startFlushLoop,
  stopFlushLoop,
} = require("../streaming/startFlushLoop");
const { TranscriptManager } = require("../transcript/transcriptManager");
const logger = require("../util/logger");
const { performance } = require("perf_hooks");

const TEST_MODE = true;
const RECYCLING_TIME = TEST_MODE ? 10 * 1000 : 4 * 60 * 1000;

class StreamingSession {
  constructor({ sessionId, youtubeUrl, ws, pythonWs }) {
    this.sessionId = sessionId;
    this.youtubeUrl = youtubeUrl;
    this.ws = ws;
    this.pythonWs = pythonWs;

    this.speechClient = new speech.SpeechClient();

    this.ffmpeg = null;
    this.streamLink = null;
    this.recognizeStream = null;
    this.oldrecognizeStream = null;
    this.newrecognizeStream = null;
    this.flushInterval = null;
    this.startTime = null;
    this.endTime = null;
    this.restartTimer = null;

    this._isStarted = false;
    this._isStopped = false;
    this.isRestarting = false;
    this.flushLoopStarted = false;
    this.isSwapped = false;

    this.queue = [];
    this.lastFfmpegDateAt = Date.now();
    this.noDataTimeout = 30000;
    this.noDataTimer = null;

    this.restartCount = 0;
    this.lastRestartAt = 0;
  }

  async start() {
    if (this.isStarted) {
      logger.info(`this session ${this.sessionId} is already started`);
      return;
    }

    if (this.pythonWs.readyState === 1) {
      this.pythonWs.send(
        JSON.stringify({
          type: "session",
          sessionId: this.sessionId,
          action: "start",
        })
      );
    } else {
      logger.info(`python websocket readystate ${this.pythonWs.readyState}`);
    }

    this._cleanupRecognizeStream();

    this.isStarted = true;
    this.isStopped = false;

    this.transcriptManager = new TranscriptManager({
      sessionId: this.sessionId,
      ws: this.ws,
      pythonWs: this.pythonWs,
      isSwapped: this.isSwapped,
    });

    this.recognizeStream = initSttStream(this);
    this.recognizeStream._streamID = `stream-${Date.now()}`;
    logger.info(
      `recognizeStream._streamID : ${this.recognizeStream._streamID}`
    );

    startFlushLoop(this);

    await startYoutubeStream(this);

    this._scheduleRestart();

    this.startTime = performance.now();
  }

  async stop({ keepWebSocket = true } = {}) {
    if (this.isStopped) return;
    this.isStarted = false;
    this.isStopped = true;

    if (!keepWebSocket && this.pythonWs.readyState === 1) {
      this.pythonWs.send(
        JSON.stringify({
          type: "session",
          sessionId: this.sessionId,
          action: "stop",
        })
      );
      this.pythonWs.close(1000, "session ended");
    }

    this.queue = [];

    stopFlushLoop(this);

    this._cleanupStreamLink();
    this._cleanupFfmpeg();
    this._cleanupRecognizeStream();
    this._clearTimers();

    clearTimeout(this.restartTimer);
    this.restartTimer = null;

    this.endTime = performance.now();

    logger.info(
      `[performance time] : startTime = ${this.startTime} endTime = ${
        this.endTime
      } performance tiem = ${this.endTime - this.startTime}`
    );
  }

  async restartGoogleStream() {
    if (this.isRestarting) return;
    this.isRestarting = true;

    try {
      logger.info(
        `♻️ Restarting only google STT stream for session ${this.sessionId}`
      );

      this.oldrecognizeStream = this.recognizeStream;

      logger.info(`this.recognizeStream : ${this.recognizeStream}`);
      logger.info(`this.oldStream : ${this.oldrecognizeStream}`);

      this.newrecognizeStream = initSttStream(this);
      this.newrecognizeStream._streamID = `stream-${Date.now()}`;

      logger.info(
        `this.newRecognizeStream : ${this.newrecognizeStream._streamID} created!`
      );

      if (!this.newrecognizeStream)
        throw new Error("Failed to create new STT stream");

      this.newrecognizeStream.once("data", () => {
        logger.info("‼️ new stream ready, swapping streams ‼️");

        this.recognizeStream = this.newrecognizeStream;
        this.isSwapped = true;
        this.transcriptManager.notifySwapped();

        if (this.oldrecognizeStream) {
          try {
            this.oldrecognizeStream.end();
            this.oldrecognizeStream.removeAllListeners();
          } catch (err) {
            logger.error(new Error(`old recognizeStream close error ${err}`));
          }
          this.oldrecognizeStream = null;
          this.newrecognizeStream = null;
        }

        this._scheduleRestart();

        logger.info("STT stream swap complete");
      });

      this.lastRestartAt = Date.now();
      this.restartCount += 1;
      this.isSwapped = false;
    } catch (err) {
      logger.error(new Error(`restartGoogleSttStream error : ${err}`));
    }

    this.isRestarting = false;
  }

  _scheduleRestart() {
    if (this.restartTimer) clearTimeout(this.restartTimer);

    this.restartTimer = setTimeout(() => {
      if (!this.isStopped && !this.isRestarting) {
        this.restartGoogleStream();
        logger.info("Google STT stream restart scheduled");
      }
    }, RECYCLING_TIME);
  }

  async _handleError(err) {
    logger.error(new Error(`‼️ STT error : ${err.message}`));

    if (this.isRestarting) return;
    this.isRestarting = true;

    this.ws?.send(JSON.stringify({ error: err.message }));

    await this.restartGoogleStream();

    this.isRestarting = false;
  }

  _handleEnd(code) {
    if (code !== 0) {
      logger.error(`❌ STT ended ${this.sessionId} code : ${code}`);
    } else {
      logger.info(`stt ended code : ${code}`);
    }
    this.stop({ keepWebSocket: false });
  }

  _cleanupRecognizeStream() {
    if (this.recognizeStream)
      try {
        this.recognizeStream.end();
        this.recognizeStream.removeAllListeners();
        this.recognizeStream = null;
        logger.debug("recognizeStream end");
      } catch (err) {
        logger.error(new Error(`❌ recognizeStream end error : ${err}`));
      }
  }

  _cleanupStreamLink() {
    if (this.streamLink) {
      try {
        this.streamLink.stdout?.removeAllListeners?.();
        this.streamLink.stderr?.removeAllListeners?.();
        this.streamLink.kill("SIGKILL");
        this.streamLink.removeAllListeners();
        this.streamLink = null;
        logger.info("streamlink end");
      } catch (err) {
        logger.error(new Error(`❌ streamlink kill error : ${err}`));
      }
    }
  }

  _cleanupFfmpeg() {
    if (this.ffmpeg) {
      try {
        this.ffmpeg.stdin?.destroy();

        this.ffmpeg.stdout?.removeAllListeners?.();
        this.ffmpeg.stderr?.removeAllListeners?.();
        this.ffmpeg.kill("SIGKILL");
        this.ffmpeg.removeAllListeners();
        this.ffmpeg = null;
        logger.info("ffmpeg end");
      } catch (err) {
        logger.error(new Error(`❌ ffmpeg kill error : ${err}`));
      }
    }
  }

  _clearTimers() {
    if (this.noDataTimer) {
      clearInterval(this.noDataTimer);
      this.noDataTimer = null;
    }

    if (this.transcriptManager && this.transcriptManager.timeout) {
      clearTimeout(this.transcriptManager.timeout);
      this.transcriptManager.timeout = null;
    }
  }
}

module.exports = { StreamingSession };
