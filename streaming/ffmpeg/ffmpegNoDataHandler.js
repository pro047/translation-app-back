const logger = require("../../util/logger");

const ffmpegNoDataHandler = (session, restartCallback) => {
  if (session.isStopped || session.isRestarting) return;

  if (session.noDataTimer) clearInterval(session.noDataTimer);

  session.noDataTimer = setInterval(() => {
    const now = Date.now();
    const localString = Date.now().toLocaleString("ko-KR");

    // const isNoDataTooLong =
    //   now - session.lastFfmpegDateAt > session.noDataTimeout;
    const isStreamlinkDead =
      !session.streamLink ||
      session.streamLink.killed ||
      session.streamLink.exitCode != null;
    const isFfmpegDead =
      !session.ffmpeg ||
      session.ffmpeg.killed ||
      session.ffmpeg.exitCode !== null;

    if (isStreamlinkDead || isFfmpegDead) {
      // if (isNoDataTooLong) {
      //   logger.warn(`[${localString}] is No Data Too Long warning..`);
      //   logger.info(`[now] : ${Date.now()}`);
      //   logger.info(`[session.lastFfmpegDateAt] : ${session.lastFfmpegDateAt}`);
      //   logger.info(`[session.noDataTimeout] : ${session.noDataTimeout}`);
      // }
      if (isStreamlinkDead) {
        logger.warn(`[${localString}] is StreamlinkDead warning..`);
      }
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
