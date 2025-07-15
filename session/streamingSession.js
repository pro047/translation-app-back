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

class StreamingSession {
  constructor({ sessionId, youtubeUrl, ws, pythonWs }) {
    this.sessionId = sessionId;
    this.youtubeUrl = youtubeUrl;
    this.ws = ws;
    this.pythonWs = pythonWs;

    this.speechClient = new speech.SpeechClient();
    this.transcriptManager = new TranscriptManager(sessionId, ws, pythonWs);

    this.ffmpeg = null;
    this.streamLink = null;
    this.recognizeStream = null;
    this.flushInterval = null;
    this.startTime = null;
    this.endTime = null;
    this.restartTimer = null;

    this._isStarted = false;
    this._isStopped = false;
    this.isRestarting = false;
    this.flushLoopStarted = false;

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

    initSttStream(this);

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

  async restart() {
    await this.stop({ keepWebSocket: true });
    await new Promise((res) => setTimeout(res, 100));
    await this.start();
  }

  _scheduleRestart() {
    if (this.restartTimer) clearTimeout(this.restartTimer);

    this.restartTimer = setTimeout(() => {
      if (!this.isStopped) this.restart();
      logger.info(`‼️ restart stream due to 5minute left`);
    }, 180000);
  }

  async _handleError(err) {
    logger.error(new Error(`‼️ STT error : ${err.message}`));

    if (this.isRestarting) return;
    this.isRestarting = true;

    this.ws?.send(JSON.stringify({ error: err.message }));

    await this.restart();

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
