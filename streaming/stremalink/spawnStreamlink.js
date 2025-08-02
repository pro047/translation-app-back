require("dotenv").config();
const { spawn } = require("child_process");
const fs = require("fs");

const cookiePath = process.env.YOUTUBE_COOKIE_PATH;
const streamlinkCmd = process.env.STREAMLINK_PATH || "streamlink";

function parseCookiesFromFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw
    .split("\n")
    .filter((line) => /SID|HSID|SSID|SAPISID|APISID/.test(line))
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      return `${parts[5]}=${parts[6]}`;
    })
    .join(";");
}

const cookieString = parseCookiesFromFile(cookiePath);

const spawnStreamLink = (youtubeUrl) => {
  const streamlink = spawn(
    streamlinkCmd,
    [
      "--http-cookie",
      cookieString,
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
