const http = require("http");
const { Server } = require("ws");
const { setupPing } = require("./util/pingpong");

const server = http.createServer();
const wss = new Server({ server, path: "/ws/python" });
const logger = require("./util/logger");
const sessionManager = require("./session/sessionManager");

server.on("upgrade", (req, socket, head) => {
  logger.info("websocket upgrade req :", req.url);
});

wss.on("connection", (ws) => {
  logger.info("websocket connected");

  setupPing(ws, "python ping pong");

  ws.on("message", (msg) => {
    try {
      const { sessionId, sentence } = JSON.parse(msg);
      const session = sessionManager.sessions.get(sessionId);
      if (session && session.transcriptManager) {
        session.transcriptManager.receive(sentence);
      } else {
        logger.error(new Error("transcript manager not found"));
      }

      logger.info(`받은 메시지 : ${msg}`);
    } catch (err) {
      logger.error(new Error(`메시지 파싱 오류 : ${err}`));
    }
  });

  ws.on("close", () => {
    logger.info("python WebSocket disconnected");
  });
});

server.listen(5002, () => {
  logger.info("server listening on 5002");
});
