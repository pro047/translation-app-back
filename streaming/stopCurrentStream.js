const { getSession } = require("../session/sessionStore");

async function stopCurrentStream(sessionId) {
  const session = getSession(sessionId);
  if (!session) return;

  console.log(`🐶 Stopping current stream for session ${sessionId}`);

  if (session.ffmpegProcess) {
    session.ffmpegProcess.kill("SIGKILL");
    session.ffmpegProcess = null;
  }

  if (session.recognizeStream) {
    session.recognizeStream.end();
    session.recognizeStream = null;
  }

  if (session.chunkWriter) {
    clearInterval(session.chunkWriter);
    session.chunkWriter = null;
  }

  session.chunkBuffer = [];
  session.sttReady = false;
  session.reconnectRequested = false;
  session.dropCount = 0;
}

module.exports = { stopCurrentStream };
