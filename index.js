require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("ws");
const { v4: uuidv4 } = require("uuid");
const { setupPing } = require("./util/pingpong");

const { deleteSession } = require("./session/sessionStore");
const sessionManager = require("./session/sessionManager");
const { connectPython } = require("./network/networkFastApi");
const logger = require("./util/logger");

const PORT = process.env.PORT;
const WEBSOCKET_URL = process.env.WEBSOCKET_URL;

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wssClient = new Server({ noServer: true });

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/start-translation", (req, res) => {
  const { youtubeUrl } = req.body;
  const sessionId = uuidv4();

  try {
    res.json({
      sessionId,
      websocketUrl: `${WEBSOCKET_URL}/ws/session?sessionId=${sessionId}&youtubeUrl=${encodeURIComponent(
        youtubeUrl
      )}`,
    });
  } catch (err) {
    console.error("🐶 startSession error: ", err);
    res.status(500).json({ error: "Failed to start session" });
  }
});

app.post("/stop-translation", (req, res) => {
  const { sessionId } = req.body;
  sessionManager.stopSession(sessionId);
  res.status(200).json({ message: "stop" });
});

server.on("upgrade", (req, socket, head) => {
  logger.info(`websocket upgrade : ${req.url}`);
  if (req.url.startsWith("/ws/session")) {
    wssClient.handleUpgrade(req, socket, head, (ws) => {
      wssClient.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

wssClient.on("connection", async (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get("sessionId");
  const youtubeUrl = url.searchParams.get("youtubeUrl");

  setupPing(ws, `Flutter Client ${sessionId}`);

  sessionManager.createSession({ sessionId, youtubeUrl, ws });
  sessionManager.startSession(sessionId);

  ws.on("close", async (code, reason) => {
    console.log("❌ Client disconnected", { code, reason });

    sessionManager.stopSession(sessionId);

    setTimeout(() => {
      deleteSession(sessionId);
      console.log("✅ delete sessions");
    }, 30000);
  });
});

connectPython();

server.listen(PORT, () => {
  console.log(`😀 Server listening on ${PORT}`);
});
