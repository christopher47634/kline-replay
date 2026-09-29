// v3 visual regression shots (desktop 1440x900 + phone 390x844) into docs/screenshots/v3/. Needs a running server.
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://localhost:3217";
const out = "docs/screenshots/v3";
const browser = await chromium.launch({ channel: "chrome", args: ["--use-angle=default", "--ignore-gpu-blocklist"] });
const errors = [];

for (const [name, viewport, touch] of [["desktop", { width: 1440, height: 900 }, false], ["mobile", { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  const shot = async (n) => page.screenshot({ path: `${out}/${name}-${n}.png`, fullPage: false });

  await page.goto(`${base}/play/2015`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(6500);
  await shot("intro");
  await page.getByRole("button", { name: /开始第 1 回合/ }).click();
  await page.waitForTimeout(1800);
  await shot("game-round1");
  for (let m = 0; m < 12; m++) {
    if (await page.getByTestId("moment-card").isVisible().catch(() => false)) {
      if (m === 1) {
        await page.waitForTimeout(900);
        await shot("moment-card");
      }
      await page.getByRole("button", { name: "不动" }).click();
    }
    await page.getByRole("button", { name: "平均分配" }).click();
    await page.waitForTimeout(400);
    if (m === 4) await shot("game-round5");
    await page.getByTestId("next-month").click();
    const d = page.getByRole("dialog", { name: "本月结算" });
    await d.waitFor({ timeout: 10000 });
    if (m === 4) {
      await page.waitForTimeout(1600);
      await shot("settle-dialog");
    }
    await d.getByRole("button", { name: /进入下个月|查看年终结算/ }).click();
    await page.waitForTimeout(300);
  }
  await page.waitForURL(/\/result/);
  await page.waitForTimeout(2500);
  await shot("result-top");
  await page.evaluate(() => window.scrollTo(0, 620));
  await page.waitForTimeout(3500);
  await shot("result-persona");
  await page.getByRole("button", { name: /听听你的 2015/ }).click();
  await page.getByRole("button", { name: "播放" }).click();
  await page.waitForTimeout(5000);
  await shot("music");
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join("\n") : "no pageerrors");
