const logger = require("../util/logger");
const _ = require("lodash");
const { SetManager } = require("../util/setManager");

class TranscriptManager {
  constructor({ sessionId, ws, pythonWs, isSwapped }) {
    this.sessionId = sessionId;
    this.ws = ws;
    this.pythonWs = pythonWs;
    this.isSwapped = isSwapped;

    this.diffQueue = [];
    this.debouncedSendToPython = _.debounce(this.flushQueue.bind(this), 500);

    this.lastPushed = "";
    this.lastNormalized = "";
    this.sentDiffs = new SetManager(1000);
  }

  notifySwapped = () => {
    this.isSwapped = true;
    this.lastPushed = "";
    logger.info(`lastPushed initialized due to stream swapped`);
  };

  getTranscript = (transcript, isFinal) => {
    const normalized = normalize(transcript);
    if (normalized === this.lastNormalized) {
      logger.debug(`duplicated normlized  transcript : ${normalized}`);
      return;
    }
    const diff = this.getDiff(normalized);
    if (!diff || this.sentDiffs.has(diff)) {
      logger.debug(`ignore duplicated diff : ${diff}`);
      return;
    }

    this.sentDiffs.add(diff);
    this.lastNormalized = normalized;

    if (isFinal === true) {
      this.lastPushed = normalized;

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

  flushQueue() {
    if (this.diffQueue.length === 0) return;

    const combinedDiff = this.diffQueue.join(" ").trim();

    this._sendToPythonWs(combinedDiff);
    this.diffQueue = [];
  }

  getDiff(normalized) {
    let normalLastPushed = normalize(this.lastPushed);

    logger.debug(`[normalized] : ${normalized}`);
    logger.debug(`[normalLastPushed] : ${normalLastPushed}`);
    logger.debug(
      `[normalized.length < normalLastPushed.length] : ${
        normalized.length < normalLastPushed.length
      }`
    );
    logger.debug(
      `[normalized includes] : ${normalized.startsWith(normalLastPushed)}`
    );

    let diff = normalized;

    if (normalized.startsWith(normalLastPushed)) {
      diff = normalized.slice(normalLastPushed.length);
    }

    if (
      normalized.length < normalLastPushed.length ||
      !normalized.startsWith(normalLastPushed)
    ) {
      // this.lastPushed = normalized;
      return;
    }

    const normalDiff = diff.trim();

    switch (true) {
      case !diff:
        logger.debug(`cannot calc due to !diff`);
        return;
      case normalDiff.length < 3:
        logger.debug(`cannot calc due to normalDiff.length < 3`);
        return;
      case normalized === normalLastPushed:
        logger.debug(`cannot calc due to normalCurr === normalLastPushed`);
        return;
    }

    this.lastPushed = normalized;

    logger.debug(`리턴 값 : ${normalDiff}`);
    return normalDiff;
  }

  _sendToPythonWs = (diff) => {
    try {
      if (this.pythonWs?.readyState === WebSocket.OPEN) {
        const data = {
          type: "transcript",
          sessionId: this.sessionId,
          transcript: diff,
        };
        this.pythonWs.send(JSON.stringify(data));
        logger.debug(`python으로 전송 : ${JSON.stringify(data)}`);
      }
    } catch (err) {
      logger.error(new Error(`파이썬 전송 실패 ${err}`));
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
