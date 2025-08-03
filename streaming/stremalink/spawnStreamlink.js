require("dotenv").config();
const { spawn } = require("child_process");
const fs = require("fs");

const cookiePath =
  process.env.YOUTUBE_COOKIE_PATH || "../../config/cookies.txt";
const streamlinkCmd = process.env.STREAMLINK_PATH || "streamlink";

function parseCookiesFromFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");

  const validkeys = new Set(["SID", "HSID", "SSID", "SAPISID", "APISID"]);

  const cookieMap = {};

  raw.split("\n").map((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 7) {
      const name = parts[5];
      const value = parts[6];
      if (validkeys.has(name)) {
        cookieMap[name] = value;
      }
    }
  });

  return Object.entries(cookieMap)
    .map(([key, value]) => `${key}=${value}`)
    .join(";");
}
const cookieString = parseCookiesFromFile(cookiePath);

const spawnStreamLink = (youtubeUrl) => {
  const streamlink = spawn(
    streamlinkCmd,
    [
      "-O",
      youtubeUrl,
      "best",
      "--http-cookie",
      cookieString,
      "--retry-streams",
      "999999",
    ],
    { env: process.env }
  );

  return streamlink;
};

module.exports = { spawnStreamLink };
