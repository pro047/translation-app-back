require("dotenv").config();

const puppeteer = require("puppeteer-extra");
const fs = require("fs");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { executablePath } = require("puppeteer");

const GOOGLE_EMAIL = process.env.GOOGLE_EMAIL;
const GOOGLE_PASSWORD = process.env.GOOGLE_PASSWORD;

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: "/user/bin/chromium",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto("https://accounts.google.com/");

  await page.type('input[type="email"]', GOOGLE_EMAIL);
  await page.click("#identifierNext");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  await page.type('input[type="password"]', GOOGLE_PASSWORD);
  await page.click("#passwordNext");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const cookies = await browser.cookies();

  const cookiesString = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  fs.writeFileSync("cookies.txt", cookiesString);

  console.log("쿠키 저장 완료");

  //   await browser.close();
})();
