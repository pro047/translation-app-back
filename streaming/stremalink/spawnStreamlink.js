require("dotenv").config();
const { spawn } = require("child_process");

const cookiePath = process.env.YOUTUBE_COOKIE_PATH;

const spawnStreamLink = (youtubeUrl) => {
  const streamlink = spawn(
    "streamlink" || process.env.STREAMLINK_PATH,
    [
      "--http-cookie",
      cookiePath,
      "--retry-streams",
      "999999",
      "-O",
      youtubeUrl,
      "best",
    ],
    { env: process.env }
  );

  return streamlink;
};

module.exports = { spawnStreamLink };
