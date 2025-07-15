const { once } = require("events");
const logger = require("../util/logger");

const FLUSH_INTERVAL = 100;

const startFlushLoop = (session) => {
  if (session.flushLoopStarted) return;
  session.flushLoopStarted = true;

  logger.info("start flush loop");

  setTimeout(() => {
    initialDelay = false;
  }, 3000);

  session.flushInterval = setInterval(() => {
    if (
      !session.isStopped &&
      session.queue.length > 0 &&
      session.recognizeStream?.writable
    ) {
      const chunk = session.queue.shift();
      if (chunk) {
        session.recognizeStream.write(chunk);
      }
    }
  }, FLUSH_INTERVAL);
};

const stopFlushLoop = (session) => {
  if (session.flushLoopStarted) {
    clearInterval(session.flushInterval);
    session.flushInterval = null;
    session.flushLoopStarted = false;
    logger.info("flush loop stopped");
  }
};

module.exports = { startFlushLoop, stopFlushLoop };
