// Home page at several scroll positions. Usage: node scripts/home_shots.mjs [desktop|mobile]
import { chromium } from "@playwright/test";

const mobile = process.argv[2] === "mobile";
const base = process.env.BASE ?? "http://localhost:3217";
const out = "docs/screenshots/v3";
const browser = await chromium.launch({ channel: "chrome", args: ["--use-angle=default", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: mobile, isMobile: mobile });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.goto(base);
await page.waitForTimeout(2500);
const tag = mobile ? "mobile" : "desktop";
const H = await page.evaluate(() => document.documentElement.scrollHeight);
console.log("page height", H);
const vh = mobile ? 844 : 900;
const stops = mobile ? [1, 2, 3, 4, 5].map((k) => k * vh * 0.9) : [1.0, 1.7, 2.3, 3.0, 4.4].map((k) => k * vh);
let n = 1;
for (const y of stops) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/home-${tag}-scroll${n++}.png` });
}
console.log(errs.length ? errs.join("\n") : "no pageerrors");
await browser.close();
