const logger = require("../util/logger");

const MAX_QUEUE_LENGTH = 10;

const queueManager = (session, data) => {
  if (session.queue.length >= MAX_QUEUE_LENGTH) {
    logger.debug(`queue length : ${session.queue.length}`);
    logger.warn("queue overflow, dropping old chunk");
    session.queue.splice(0, 10);
  }
  session.queue.push(data);
};

module.exports = { queueManager };
