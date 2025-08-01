require("dotenv").config();
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const cookiePath = process.env.YOUTUBE_COOKIE_PATH;

function parseCookiesFromFile(filePath) {
  const cookies = [];

  const lines = fs.readFileSync(filePath, "utf8").split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.trim() === "") continue;

    const parts = line.split("\t");
    if (parts.length >= 7) {
      const key = parts[5];
      const value = parts[6];
      cookies.push(`--http-cookie`);
      cookies.push(`${key}=${value}`);
    }
  }

  return cookies;
}

const spawnStreamLink = (youtubeUrl) => {
  const cookieArgs = parseCookiesFromFile(cookiePath);

  const streamlink = spawn(
    "streamlink" || process.env.STREAMLINK_PATH,
    ["-O", youtubeUrl, "best", ...cookieArgs, "--retry-streams", "999999"],
    { env: process.env }
  );

  return streamlink;
};

module.exports = { spawnStreamLink };
