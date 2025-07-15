const { spawn } = require("child_process");

async function getYoutubeAudioStreamUrl(youtubeUrl) {
  console.log("streamlink called");

  return new Promise((resolve, reject) => {
    console.log("fetching youtube stream url..", youtubeUrl);

    const streamlink = spawn("streamlink", [
      "-O",
      youtubeUrl,
      "best",
      "--retry-streams",
      "infinite",
    ]);

    let streamUrl = "";
    let errorOutput = "";

    ytDlp.stdout.on("data", (data) => {
      streamUrl += data.toString();
    });

    ytDlp.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.error(`🌭 yt-Dlp error: ${data}`);
    });

    ytDlp.on("close", (code) => {
      if (code != 0 || !streamUrl.trim()) {
        reject(`yt-dlp failed with code ${code}, error: ${errorOutput}`);
      } else {
        resolve(streamUrl.trim());
      }
    });
  });
}

module.exports = { getYoutubeAudioStreamUrl };
