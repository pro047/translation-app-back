require("dotenv").config();
const { spawn } = require("child_process");

const spawnStreamLink = (youtubeUrl) => {
  const streamlink = spawn(
    "streamlink" || process.env.STREAMLINK_PATH,
    ["-O", youtubeUrl, "best", "--retry-streams", "999999"],
    { env: process.env }
  );

  return streamlink;
};

module.exports = { spawnStreamLink };
