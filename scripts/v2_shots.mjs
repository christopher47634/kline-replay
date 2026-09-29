// Screenshots for the v2 checkpoint. Usage: node scripts/v2_shots.mjs [baseUrl]
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3217";
const out = "docs/screenshots/v2";
const browser = await chromium.launch({ channel: "chrome" });
const errors = [];

async function play(page, rounds, shotAt) {
  await page.goto(`${base}/play/2015`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: /开始第 1 回合/ }).click();
  for (let m = 0; m < rounds; m++) {
    if (await page.getByTestId("moment-card").isVisible().catch(() => false)) await page.getByRole("button", { name: "不动" }).click();
    if (shotAt[m]) await shotAt[m]();
    await page.getByRole("button", { name: "平均分配" }).click();
    await page.getByRole("button", { name: /进入下个月|结算最后一个月/ }).first().click();
    const d = page.getByRole("dialog", { name: "本月结算" });
    await d.waitFor();
    await d.getByRole("button", { name: /进入下个月|查看年终结算/ }).click();
  }
}

for (const [name, viewport] of [["desktop", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: name === "mobile" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  await play(page, 12, {
    0: () => page.waitForTimeout(400).then(() => page.screenshot({ path: `${out}/${name}-01-round1.png`, fullPage: true })),
    4: () => page.waitForTimeout(400).then(() => page.screenshot({ path: `${out}/${name}-02-round5.png`, fullPage: true })),
  });
  await page.waitForURL(/\/result/);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${name}-03-result.png`, fullPage: true });
  await page.getByRole("button", { name: /听听你的 2015/ }).click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "播放" }).click();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${out}/${name}-04-music.png` });
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join("\n") : "no pageerrors");
