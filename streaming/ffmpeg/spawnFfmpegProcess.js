require("dotenv").config();
const { spawn } = require("child_process");
const logger = require("../../util/logger");

const spawnFfmpegProcess = (streamUrl) => {
  const ffmpegArgs = [
    "-i",
    streamUrl,
    "-vn",
    "-acodec",
    "pcm_s16le",
    "-ar",
    "16000",
    "-ac",
    "1",
    "-f",
    "s16le",
    "pipe:1",
  ];

  const ffmpegProcess = spawn("ffmpeg" || process.env.FFMPEG_PATH, ffmpegArgs, {
    env: process.env,
  });

  if (!ffmpegProcess || !ffmpegProcess.stdout) {
    throw new Error("ffmpeg spawn failed");
  } else {
    logger.info("🎬 ffmpeg start");
  }

  return ffmpegProcess;
};

module.exports = { spawnFfmpegProcess };
