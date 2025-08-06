const { execSync } = require("child_process");
const logger = require("../../util/logger");

async function getYoutubeAudioStreamUrl(youtubeUrl) {
  let streamUrl;

  try {
    streamUrl = execSync(
      `yt-dlp -g --cookies-from-browser chrome "${youtubeUrl}"`,
      { encoding: "utf-8" }
    ).trim();
    logger.info("Extracted stream url:", streamUrl);
  } catch (err) {
    logger.error("extract url failed:", err);
    return;
  }
}

module.exports = { getYoutubeAudioStreamUrl };
