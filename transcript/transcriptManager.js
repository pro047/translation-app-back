const logger = require("../util/logger");
const _ = require("lodash");

class TranscriptManager {
  constructor(sessionId, ws, pythonWs) {
    this.sessionId = sessionId;
    this.ws = ws;
    this.pythonWs = pythonWs;

    this.diffQueue = [];
    this.debouncedSendToPython = _.debounce(this.flushQeueue.bind(this), 500);

    this.lastPushed = "";
  }

  getTranscript = (transcript, isFinal) => {
    const diff = this.getDiff(transcript);
    if (!diff) return;

    if (isFinal === true) {
      this.lastPushed = "";

      logger.debug(
        `[normalCurrTrans at isFinal] : ${normalize(
          transcript
        )} \n ‼️ [normalLastPushed] : ${normalize(this.lastPushed)}`
      );
    }

    if (!this.diffQueue.includes(diff)) {
      this.diffQueue.push(diff);
    }
    this.debouncedSendToPython();
  };

  flushQeueue() {
    if (this.diffQueue.length === 0) return;

    // this.diffQueue.forEach((i) => logger.debug(`[diffQueue values] : ${i}`));

    const combinedDiff = this.diffQueue.join(" ").trim();
    // logger.debug(`[combinedDiff] : ${combinedDiff}`);

    this._sendToPythonWs(this.sessionId, combinedDiff);
    this.diffQueue = [];
  }

  getDiff(transcript) {
    const normalCurrTrans = normalize(transcript);
    let normalLastPushed = normalize(this.lastPushed);

    logger.debug(`[normalCurrTrans] : ${normalCurrTrans}`);
    logger.debug(`[normalLastPushed] : ${normalLastPushed}`);
    logger.debug(
      `[normalCurrTrans.length < normalLastPushed.length] : ${
        normalCurrTrans.length < normalLastPushed.length
      }`
    );
    logger.debug(
      `[normalCurrTrans includes] : ${normalCurrTrans.includes(
        normalLastPushed
      )}`
    );

    let diff = normalCurrTrans;

    if (normalCurrTrans.includes(normalLastPushed)) {
      diff = normalCurrTrans.slice(normalLastPushed.length);
    }

    if (normalCurrTrans.length < normalLastPushed.length) {
      this.lastPushed = normalCurrTrans;
      return;
    }

    if (!normalCurrTrans.includes(normalLastPushed)) {
      this.lastPushed = normalCurrTrans;
      return;
    }

    const normalDiff = diff.trim();

    if (
      !diff ||
      normalDiff.length < 5 ||
      normalCurrTrans === normalLastPushed
    ) {
      logger.debug(`can calc normalDiff`);
      return;
    }

    this.lastPushed = normalCurrTrans;

    logger.debug(`리턴 값 : ${normalDiff}`);
    return normalDiff;
  }

  _sendToPythonWs = (sessionId, diff) => {
    if (this.pythonWs.readyState === WebSocket.OPEN) {
      const data = JSON.stringify({
        type: "transcript",
        sessionId,
        text: diff,
      });
      this.pythonWs.send(data);
      logger.debug(`python으로 전송 : ${data}`);
    } else {
      logger.error("python으로 전송 실패");
    }
  };

  receive(sentence, isFianl) {
    this.pushToClient(sentence, isFianl);
  }

  pushToClient(sentence, isFianl) {
    if (
      !this.ws ||
      this.ws.readyState !== 1 ||
      !this.sessionId ||
      sentence.trim().length === 0
    )
      return;

    this.ws.send(JSON.stringify({ transcript: sentence, isFinal: isFianl }));
  }
}

function normalize(text) {
  return text
    .trim()
    .replace(/[\s]+/g, " ")
    .replace(/[.,!?]/g, "");
}

module.exports = { TranscriptManager };
