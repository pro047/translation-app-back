require("dotenv").config();
const { spawn } = require("child_process");
const fs = require("fs");

const cookiePath = "./config/cookies.txt";
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

console.log("cookieString typeof:", typeof cookieString);
console.log("cookieString value:", cookieString);
console.log("args:", [
  "best",
  "--http-cookie",
  cookieString,
  "--http-header",
  "User-Agent=...",
  "--http-header",
  "Origin=https://www.youtube.com",
  "--http-header",
  "Referer=https://www.youtube.com/",
]);

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

  streamlink.stdout.on("data", (data) => {
    console.log(`[stdout] ${data}`);
  });

  streamlink.stderr.on("data", (data) => {
    console.error(`[stderr] ${data}`);
  });

  streamlink.on("close", (code) => {
    console.log(`streamlink process exited with code ${code}`);
  });
};

const youtubeUrl = process.argv[2];
if (!youtubeUrl) {
  console.error("not found youtubeUrl");
  process.exit(1);
}
spawnStreamLink(youtubeUrl);
