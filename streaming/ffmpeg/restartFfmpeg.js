const restartFfmpeg = (session, onStart) => {
  if (session.isStopped || session.isRestarting) return;

  session.isRestarting = true;

  const now = Date.now();

  if (now - session.lastRestartAt < 60000) {
    session.restartCount++;
    if (session.restartCount > 5) {
      console.warn("[warn] ffmpeg restart too frequent sleeping...");
      setTimeout(() => (session.restartCount = 0), 60000);
      return;
    }
  } else {
    session.restartCount = 0;
  }
  session.lastRestartAt = now;

  try {
    if (session.streamLink) {
      session.streamLink.stdout?.removeAllListeners?.();
      session.streamLink.stderr?.removeAllListeners?.();
      session.streamLink.kill("SIGKILL");
      session.streamLink.removeAllListeners();
      session.streamLink = null;
    }

    if (session.ffmpeg) {
      session.ffmpeg.stdin?.destroy();

      session.ffmpeg.stdout?.removeAllListeners?.();
      session.ffmpeg.stderr?.removeAllListeners?.();
      session.ffmpeg.kill("SIGKILL");
      session.ffmpeg.removeAllListeners();
      session.ffmpeg = null;
    }
  } catch (err) {
    console.warn("ffmpeg kill err", err);
  }

  onStart(session);
};

module.exports = { restartFfmpeg };
