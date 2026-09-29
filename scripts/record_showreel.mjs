// Records a ~40 s showreel (B-roll for the demo video): hero → scroll story → intro → a round and its settlement →
// the result page and persona card → the music. Usage: node scripts/record_showreel.mjs [baseUrl]
// Needs Playwright's ffmpeg (`npx playwright install ffmpeg`, PLAYWRIGHT_BROWSERS_PATH on a non-system drive).
// Output: demo/showreel.webm and demo/showreel.json (shot list with start seconds). The liquidation effect cannot be
// reached with the 2015/2020 data (no month drops far enough), so it is shown on /dev/motion in a dev build instead.
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3217";
mkdirSync("demo", { recursive: true });
const size = { width: 1440, height: 810 };
const tmp = mkdtempSync(join(tmpdir(), "kline-reel-"));
const browser = await chromium.launch({ channel: "chrome", args: ["--use-angle=default", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: tmp, size } });
const page = await ctx.newPage();
const t0 = Date.now();
const shots = [];
const at = async (name, ms) => {
  shots.push({ name, start: +((Date.now() - t0) / 1000).toFixed(1) });
  await page.waitForTimeout(ms);
};

await page.goto(base);
await page.evaluate(() => localStorage.clear());
await page.reload();
await at("hero: particles fly in, 5178 rolls", 5500);
await page.mouse.move(360, 520);
await page.mouse.move(700, 470, { steps: 25 });
await at("hero: pointer pushes the field", 1500);
for (let i = 0; i < 14; i++) {
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(260);
}
await at("scroll story: headlines → sliders → line", 4200);
await page.evaluate(() => window.scrollTo({ top: 0 }));
await page.getByRole("link", { name: "开始穿越" }).click();
await at("intro: archive card, teletype", 5200);
await page.getByRole("button", { name: /开始第 1 回合/ }).click();
await at("game: page turns in", 2200);
for (const [label, v] of [["上证50 ETF", "30"], ["创业板 ETF", "25"], ["银行板块", "10"], ["白酒板块", "5"], ["货币基金", "10"], ["融资加杠杆", "20"]]) {
  await page.getByLabel(`${label} 百分比`).fill(v);
  await page.waitForTimeout(220);
}
await at("game: damped sliders, total 100%", 800);
await page.getByTestId("next-month").click();
await page.getByRole("dialog", { name: "本月结算" }).waitFor();
await at("settle: the number rolls, rows slide in", 4200);
await page.getByRole("dialog", { name: "本月结算" }).getByRole("button", { name: /进入下个月/ }).click();
// fast-forward
for (let m = 1; m < 12; m++) {
  if (await page.getByTestId("moment-card").isVisible().catch(() => false)) await page.getByRole("button", { name: "不动" }).click();
  await page.getByRole("button", { name: "平均分配" }).click();
  await page.getByTestId("next-month").click();
  const d = page.getByRole("dialog", { name: "本月结算" });
  await d.waitFor();
  await page.waitForTimeout(500);
  await d.getByRole("button", { name: /进入下个月|查看年终结算/ }).click();
}
await page.waitForURL(/\/result/);
await at("result: rolling number, stamp, lines drawn in turn", 4300);
await page.evaluate(() => window.scrollTo({ top: 620, behavior: "smooth" }));
await at("persona card flips", 4200);
await page.getByRole("button", { name: /听听你的 2015/ }).click();
await page.getByRole("button", { name: "播放" }).click();
await page.getByRole("button", { name: "切换速度" }).click();
await at("music: duet, glow follows the notes", 6500);

const video = page.video();
await ctx.close();
copyFileSync(await video.path(), "demo/showreel.webm");
writeFileSync("demo/showreel.json", JSON.stringify({ total: +((Date.now() - t0) / 1000).toFixed(1), size, shots }, null, 1));
console.log("wrote demo/showreel.webm", shots.at(-1).start + 6.5, "s");
await browser.close();
