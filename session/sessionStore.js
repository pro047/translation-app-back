const sessions = new Map();

function setSession(sessionId, data) {
  sessions.set(sessionId, data);
}

function getSession(sessionId) {
  return sessions.get(sessionId);
}

function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

module.exports = { setSession, getSession, deleteSession };
