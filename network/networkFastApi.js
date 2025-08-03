const WebSocket = require("ws");
const logger = require("../util/logger");

let pythonWs = null;
let reconnectTimer = null;
let onMessageCallback = null;

const connectPython = () => {
  pythonWs = new WebSocket("ws://3.39.224.64:8000/ws/python");

  pythonWs.on("open", () => {
    logger.info("python 연결 성공");
  });
  pythonWs.on("message", (message) => {
    if (!onMessageCallback) return;

    try {
      const { sessionId, sentence, isFinal } = JSON.parse(message);
      onMessageCallback(sessionId, sentence, isFinal);
      logger.info(`받은 메시지 : ${message}`);
    } catch (err) {
      logger.error(new Error(`message parsing error : ${err}`));
    }
  });

  pythonWs.on("close", (err) => {
    logger.error(new Error(`Failed python connecting : ${err}`));
    scheduleRestart();
  });

  pythonWs.on("error", (err) => {
    logger.error(new Error(`python 연결 실패: ${err}`));
    pythonWs.close();
  });
};

const scheduleRestart = () => {
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectPython();
  }, 3000);
};

const setOnMessageCallback = (callback) => {
  onMessageCallback = callback;
};

module.exports = {
  connectPython,
  setOnMessageCallback,
  getPythonSocket: () => pythonWs,
};
