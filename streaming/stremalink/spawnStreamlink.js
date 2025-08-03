require("dotenv").config();
const { spawn } = require("child_process");
const fs = require("fs");

const cookiePath =
  process.env.YOUTUBE_COOKIE_PATH || "../../config/cookies.txt";
const streamlinkCmd = process.env.STREAMLINK_PATH || "streamlink";

function parseCookiesFromFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");

    const validkeys = new Set([
      "SID",
      "HSID",
      "SSID",
      "SAPISID",
      "APISID",
      "__Secure-1PSID",
      "__Secure-3PSID",
    ]);

    const cookieMap = {};

    raw.split("\n").forEach((line) => {
      if (line.startsWith("#") || line.trim() === "") return;
      const parts = line.trim().split(/\s+/);
      if (parts.length < 7) return;

      const domain = parts[0];
      const name = parts[5];
      const value = parts[6];

      if (
        (domain.includes("youtube.com") || domain.includes(".youtube.com")) &&
        validkeys.has(name)
      ) {
        cookieMap[name] = value;
      }
    });

    return Object.entries(cookieMap)
      .map(([key, value]) => `${key}=${value}`)
      .join(";");
  } catch (err) {
    console.error("failed to read cookie file:", err.message);
    throw err;
  }
}
const cookieString = parseCookiesFromFile(cookiePath);

const spawnStreamLink = (youtubeUrl) => {
  const streamlink = spawn(
    streamlinkCmd,
    [
      "--loglevel",
      "debug",
      "-O",
      youtubeUrl,
      "best",
      "--http-cookie",
      cookieString,
      "--http-header",
      "User-Agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
      "--http-header",
      "Origin=https://www.youtube.com",
      "--http-header",
      "Referer=https://www.youtube.com/",
      "--retry-streams",
      "999999",
    ],
    { env: process.env }
  );

  return streamlink;
};

module.exports = { spawnStreamLink };
