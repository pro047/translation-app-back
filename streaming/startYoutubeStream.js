const { ffmpegEventHandler } = require("./ffmpeg/ffmpegEventHandler");
const { ffmpegNoDataHandler } = require("./ffmpeg/ffmpegNoDataHandler");
const { spawnFfmpegProcess } = require("./ffmpeg/spawnFfmpegProcess");
const { restartFfmpeg } = require("./ffmpeg/restartFfmpeg");
const logger = require("../util/logger");
const { queueManager } = require("../queue/queueManager");
const { puppeteerLogin } = require("./puppeteerLogin/puppeteerLogin");
const {
  getYoutubeAudioStreamUrl,
} = require("./ytDlp/getYoutubeAudioStreamUrl");

const CHUNK_SIZE = 3200;
const BUFFER_MULTIPLIER = 10;
const TOTAL_BUFFER_SIZE = CHUNK_SIZE * BUFFER_MULTIPLIER;

const startYoutubeStream = async (session) => {
  try {
    await puppeteerLogin();
    const streamUrl = await getYoutubeAudioStreamUrl(session.youtubeUrl);

    const ffmpeg = spawnFfmpegProcess(streamUrl);
    session.ffmpeg = ffmpeg;

    const audioBuffer = Buffer.alloc(TOTAL_BUFFER_SIZE);
    let bufferOffset = 0;

    ffmpegEventHandler(
      ffmpeg,
      (chunk) => {
        const remainingSpace = TOTAL_BUFFER_SIZE - bufferOffset;
        if (chunk.length > remainingSpace) {
          bufferOffset = 0;
        }

        chunk.copy(audioBuffer, bufferOffset);
        bufferOffset += chunk.length;

        while (bufferOffset >= CHUNK_SIZE) {
          const dataToSend = Buffer.from(audioBuffer.subarray(0, CHUNK_SIZE));
          queueManager(session, dataToSend);

          const remainingLength = bufferOffset - CHUNK_SIZE;
          if (remainingLength > 0) {
            audioBuffer.copy(audioBuffer, 0, CHUNK_SIZE, bufferOffset);
          }
          bufferOffset = remainingLength > 0 ? remainingLength : 0;
        }
      },
      (data) => logger.error(`[ffmpeg stderr] ${data}`),
      (err) => session._handleError(err),
      (code) => session._handleEnd(code)
    );

    ffmpegNoDataHandler(session, () =>
      restartFfmpeg(session, startYoutubeStream)
    );
  } catch (err) {
    throw new Error(`start youtube stream error : ${err}`);
  } finally {
    session.isRestarting = false;
  }
};

module.exports = { startYoutubeStream };
