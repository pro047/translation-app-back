require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("ws");
const { v4: uuidv4 } = require("uuid");

const { deleteSession } = require("./session/sessionStore");
const { SessionManager } = require("./session/sessionManager");

const PORT = process.env.PORT || 5001;

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new Server({ server, path: "/ws/session" });
const sessionManager = new SessionManager();

app.post("/start-translation", async (req, res) => {
  const { youtubeUrl } = req.body;
  const sessionId = uuidv4();

  try {
    res.json({
      sessionId,
      websocketUrl: `wss://2efe-220-124-99-7.ngrok-free.app/ws/session?sessionId=${sessionId}&youtubeUrl=${encodeURIComponent(
        youtubeUrl
      )}`,
    });
  } catch (err) {
    console.error("🐶 startSession error: ", err);
    res.status(500).json({ error: "Failed to start session" });
  }
});

app.post("/stop-translation", async (req, res) => {
  const { sessionId } = req.body;
  sessionManager.stopSession(sessionId);
  res.status(200).json({ message: "stop" });
});

wss.on("connection", async (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get("sessionId");
  const youtubeUrl = url.searchParams.get("youtubeUrl");

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

server.listen(PORT, () => {
  console.log(`😀 Server listening on ${PORT}`);
});
