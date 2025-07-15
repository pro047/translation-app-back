const logger = require("../../util/logger");

const streamlinkEventHandler = (streamlink, onError, onClose) => {
  streamlink.stderr.on("data", (data) => {
    logger.error(new Error(`[Streamlink stderr] : ${data}`));
  });

  streamlink.on("error", (err) => {
    logger.error(new Error(`streamlink error :, ${err}`));
    onError?.(err);
  });

  streamlink.on("close", (code) => {
    logger.info(`streamlink process exited with code ${code}`);
    onClose?.(code);
  });
};

module.exports = { streamlinkEventHandler };
