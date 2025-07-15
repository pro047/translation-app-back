const WebSocket = require("ws");
const logger = require("../util/logger");

const pythonWs = new WebSocket("ws://127.0.0.1:8765");

let onMessageCallback = null;

pythonWs.on("open", () => {
  logger.info("python 연결 성공");
});
pythonWs.on("message", (message) => {
  if (!onMessageCallback) return;

  try {
    const { sessionId, sentence, isFianl } = JSON.parse(message);
    onMessageCallback(sessionId, sentence, isFianl);
    logger.info(`받은 메시지 : ${message}`);
  } catch (err) {
    logger.error(new Error(`message parsing error : ${err}`));
  }
});

pythonWs.on("error", (err) => {
  logger.error(new Error(`python 연결 실패: ${err}`));
});

const setOnMessageCallback = (callback) => {
  onMessageCallback = callback;
};

module.exports = { pythonWs, setOnMessageCallback };
