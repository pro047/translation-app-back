require("dotenv").config();

const puppeteer = require("puppeteer");

async function puppeteerLogin() {
  const browser = await puppeteer.launch({
    headless: false,
    uesrDataDir: "./puppeteer_data",
    executablePath:
      "/Application/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const page = await browser.newPage();
  await page.goto("http://www.youtube.com", { waitUntil: "load" });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  await browser.close();
}

module.exports = { puppeteerLogin };
