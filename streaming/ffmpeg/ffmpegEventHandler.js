const logger = require("../../util/logger");

const ffmpegEventHandler = (
  ffmpeg,
  onChunk,
  onErrorCheck,
  onError,
  onClose
) => {
  ffmpeg.stdout.on("data", (chunk) => {
    onChunk(chunk);
  });

  ffmpeg.stderr.on("data", (data) => {
    onErrorCheck(data);
  });

  ffmpeg.on("error", (err) => {
    logger.error(new Error(`ffmpeg error :, ${err}`));
    onError?.(err);
  });

  ffmpeg.on("close", (code) => {
    logger.info(`ffmpeg process exited with code ${code}`);
    onClose?.(code);
  });
};

module.exports = { ffmpegEventHandler };
