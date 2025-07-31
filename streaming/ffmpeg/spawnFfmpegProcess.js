require("dotenv").config();
const { spawn } = require("child_process");
const logger = require("../../util/logger");

const spawnFfmpegProcess = () => {
  const ffmpegArgs = [
    "-re",
    "-i",
    "pipe:0",
    "-vn",
    "-acodec",
    "pcm_s16le",
    "-ar",
    "16000",
    "-ac",
    "1",
    "-f",
    "s16le",
    "-bufsize",
    "512k",
    "-probesize",
    "32",
    "-analyzeduration",
    "0",
    "-flush_packets",
    "1",
    "-fflags",
    "nobuffer",
    "-loglevel",
    "verbose",
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
