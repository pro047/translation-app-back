const logger = require("../../util/logger");

const ffmpegNoDataHandler = (session, restartCallback) => {
  if (session.isStopped || session.isRestarting) return;

  if (session.noDataTimer) clearInterval(session.noDataTimer);

  session.noDataTimer = setInterval(() => {
    const now = Date.now();
    const localString = Date.now().toLocaleString("ko-KR");

    const isFfmpegDead =
      !session.ffmpeg ||
      session.ffmpeg.killed ||
      session.ffmpeg.exitCode !== null;

    if (isFfmpegDead) {
      if (isFfmpegDead) {
        logger.warn(`[${localString}] is FfmpegDead warning..`);
      }
      clearInterval(session.noDataTimeout);
      session.isRestarting = false;
      restartCallback();
    }
  }, 3000);
};

module.exports = { ffmpegNoDataHandler };
