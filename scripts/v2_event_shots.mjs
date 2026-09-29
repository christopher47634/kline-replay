// Screenshots of the event mode. Usage: node scripts/v2_event_shots.mjs [baseUrl]
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3217";
const out = "docs/screenshots/v2";
const browser = await chromium.launch({ channel: "chrome" });
const errors = [];

for (const [name, viewport] of [["desktop", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport, hasTouch: name === "mobile" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await page.goto(`${base}/events`);
  await page.screenshot({ path: `${out}/${name}-10-events-home.png`, fullPage: true });
  await page.goto(`${base}/events/a-share-classics`);
  await page.getByLabel(/进阶模式/).check();
  await page.getByRole("button", { name: "开始" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${name}-11-event-guess.png`, fullPage: true });
  await page.getByTestId("guess-up").click();
  await page.getByTestId("bucket-3").click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}-12-event-reveal-mid.png`, fullPage: true });
  await page.getByTestId("event-reveal").waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}-13-event-shown.png`, fullPage: true });
  for (let n = 1; n < 10; n++) {
    await page.getByTestId("next-card").click();
    await page.getByTestId(n % 3 ? "guess-up" : "guess-down").click();
    await page.getByTestId("bucket-2").click();
    await page.getByTestId("event-reveal").waitFor({ timeout: 10000 });
  }
  await page.getByTestId("next-card").click();
  await page.waitForURL(/result/);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}-14-event-result.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join("\n") : "no pageerrors");
