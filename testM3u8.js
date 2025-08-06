const puppeteer = require("puppeteer");
const { spawn, execSync } = require("child_process");

const YOUTUBE_URL =
  "https://www.youtube.com/live/l6gApyENr1A?si=rnQTkqBdq8g7A4Yg";

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: "./puppeteer_data",
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const page = await browser.newPage();

  let mpdUrl = null;

  page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes(".mpd") || url.includes(".m3u8")) {
      mpdUrl = url;
      console.log("mpd url found:", mpdUrl);
    }

    req.continue().catch((err) => {
      console.error("continue error:", err);
    });
  });

  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes(".mpd")) {
      console.log("found mpd manifest:", url);
    }
  });

  await page.goto(YOUTUBE_URL, { waitUntil: "load", timeout: 60000 });

  await new Promise((resolve) => setTimeout(resolve, 10000));

  if (!mpdUrl) {
    console.log("mpd url not found");

    try {
      const output = execSync(
        `yt-dlp -g --cookies-from-browser chrome "${YOUTUBE_URL}"`
      )
        .toString()
        .trim()
        .split("\n");

      mpdUrl = output[output.length - 1];
      console.log("yt-dlp fallback url:", mpdUrl);
    } catch (err) {
      console.error("yt-dlp fallback failed:", err);
      return;
    }
  }

  const ffmpeg = spawn("ffmpeg", [
    "-i",
    mpdUrl,
    "-vn",
    "-acodec",
    "pcm_s16le",
    "-ar",
    "16000",
    "-ac",
    "1",
    "-f",
    "s16le",
    "pipe:1",
  ]);

  ffmpeg.stdout.on("data", (chunk) => {
    console.log("chunk:", chunk.length);
  });

  ffmpeg.stderr.on("data", (data) => {
    console.error(`ffmpeg stderr: ${data}`);
  });

  ffmpeg.on("close", (code) => {
    console.log(`ffmepg exit, code : ${code}`);
  });
})();
