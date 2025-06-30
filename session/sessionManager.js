const { setSession, deleteSession } = require("./sessionStore");
const { StreamingSession } = require("./streamingSession");
const debounce = require("lodash.debounce");
const statLogger = require("../statLogger");

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.debouncePushMap = new Map();
    this.lastTranscriptMap = new Map();
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
      pushToClient: (data) => this.pushToClient(sessionId, data),
    });

    this.sessions.set(sessionId, session);
    setSession(sessionId, session);

    this.debouncePushMap.set(
      sessionId,
      debounce((data) => {
        this._realPush(sessionId, data);
      }, 500)
    );
    return session;
  }

  pushToClient(sessionId, data) {
    const last = this.lastTranscriptMap.get(sessionId);
    const payload = JSON.stringify(data);
    statLogger.addClient(Buffer.byteLength(payload, "utf8"));

    if (data.isFinal) {
      if (last === data.transcript) return;
      this.lastTranscriptMap.set(sessionId, data.transcript);
      this._realPush(sessionId, data);
      return;
    }

    if (last === data.transcript) return;
    this.lastTranscriptMap.set(sessionId, data.transcript);

    const debounced = this.debouncePushMap.get(sessionId);
    if (debounced) debounced(data);
    else this._realPush(sessionId, data);

    setInterval(() => {
      statLogger.flush();
    }, 1000);
  }

  _realPush(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (session && session.ws && session.ws.readyState === 1) {
      session.ws.send(JSON.stringify(data));
    }
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
    this.debouncePushMap.delete(sessionId);
    this.lastTranscriptMap.delete(sessionId);
    deleteSession(sessionId);
  }

  async restartSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    await session.restart();
  }
}

module.exports = { SessionManager };
