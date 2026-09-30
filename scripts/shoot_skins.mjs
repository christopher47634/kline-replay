// `node scripts/shoot_skins.mjs` (after `next build`): real screenshots for the 阅读设置 drawer instead of CSS mock-ups.
//   public/art/skin-{pan,paper,plain}.jpg  the game board in each skin (theme cards)
//   public/art/glass-bg.jpg                a live chart, the backdrop the glass sample refracts
// Uses the system Chrome through Playwright, like the e2e tests.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";

const PORT = 3322;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 5000));
const base = `http://localhost:${PORT}`;
const browser = await chromium.launch({ channel: "chrome" });

async function board(skin, dsf, fn) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: dsf, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.addInitScript((s) => {
    localStorage.setItem("kline:prefs", JSON.stringify({ skin: s }));
    localStorage.setItem("kline:sound-asked", "1");
  }, skin);
  await page.goto(`${base}/play/2015`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /开始第 1 回合/ }).click();
  await page.waitForTimeout(800);
  for (let m = 0; m < 5; m++) {
    if (await page.getByTestId("moment-card").isVisible().catch(() => false)) await page.getByRole("button", { name: "不动" }).click();
    await page.getByRole("button", { name: "平均分配" }).click();
    await page.getByTestId("next-month").click();
    const d = page.getByRole("dialog", { name: "本月结算" });
    await d.waitFor();
    await d.getByRole("button", { name: /进入下个月/ }).click();
    await page.waitForTimeout(400);
  }
  if (await page.getByTestId("moment-card").isVisible().catch(() => false)) await page.getByRole("button", { name: "不动" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1200);
  await fn(page);
  await ctx.close();
}

for (const skin of ["pan", "paper", "plain"]) {
  await board(skin, 0.3, (page) => page.screenshot({ path: `public/art/skin-${skin}.jpg`, type: "jpeg", quality: 82, clip: { x: 150, y: 0, width: 980, height: 640 } }));
  console.log("skin", skin);
}
await board("pan", 1, async (page) => {
  const chart = page.locator("section[aria-label='走势']");
  const b = await chart.boundingBox();
  await page.screenshot({ path: "public/art/glass-bg.jpg", type: "jpeg", quality: 80, clip: { x: b.x, y: b.y + 40, width: b.width, height: 170 } });
});
console.log("glass-bg");
await browser.close();
server.kill();
