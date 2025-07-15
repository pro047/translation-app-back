const { pythonWs, setOnMessageCallback } = require("../network/networkFastApi");
const logger = require("../util/logger");
const { setSession, deleteSession } = require("./sessionStore");
const { StreamingSession } = require("./streamingSession");

class SessionManager {
  constructor() {
    this.sessions = new Map();

    setOnMessageCallback((sessionId, sentence) => {
      const session = this.sessions.get(sessionId);
      if (session && session.transcriptManager) {
        session.transcriptManager.receive(sentence);
      } else {
        logger.error(`session / transcriptMananger not found : ${sessionId}`);
      }
    });
  }

  createSession({ sessionId, youtubeUrl, ws }) {
    if (this.sessions.has(sessionId)) {
      const oldSession = this.sessions.get(sessionId);
      oldSession.stop();
      this.sessions.delete(sessionId);
      deleteSession(sessionId);
    }

    const session = new StreamingSession({
      sessionId,
      youtubeUrl,
      ws,
      pythonWs,
    });

    this.sessions.set(sessionId, session);
    setSession(sessionId, session);

    return session;
  }

  async startSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) throw new Error(`Session ${sessionId} not found`);

    await session.start();
  }

  async stopSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    await session.stop();
    this.sessions.delete(sessionId);
    deleteSession(sessionId);
  }

  async restartSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    await session.restart();
  }
}

module.exports = new SessionManager();
