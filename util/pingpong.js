const logger = require("../util/logger");

const setupPing = (ws, label) => {
  ws.isAlive = true;

  ws.on("pong", () => {
    logger.debug(`${label} pong received`);
    ws.isAlive = true;
  });

  const interval = setInterval(() => {
    if (!ws.isAlive) {
      logger.info(`${label} connect lost`);
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  }, 30000);

  ws.on("close", () => clearInterval(interval));
};

module.exports = { setupPing };
