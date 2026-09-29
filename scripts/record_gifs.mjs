// Records three ~6 s clips with Playwright and converts them to GIFs with ffmpeg.
// Usage: node scripts/record_gifs.mjs [baseUrl]     (needs a running server and ffmpeg on PATH)
// Output: public/og/game-round.gif, persona-card.gif, music-duet.gif
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3217";
const outDir = "public/og";
mkdirSync(outDir, { recursive: true });
const size = { width: 960, height: 600 };

/** Plays the first `rounds` rounds of 2015 with even splits, dismissing moment cards with "不动". */
async function playRounds(page, rounds) {
  for (let m = 0; m < rounds; m++) {
    if (await page.getByTestId("moment-card").isVisible().catch(() => false)) await page.getByRole("button", { name: "不动" }).click();
    await page.getByRole("button", { name: "平均分配" }).click();
    await page.getByRole("button", { name: /进入下个月|结算最后一个月/ }).first().click();
    const d = page.getByRole("dialog", { name: "本月结算" });
    await d.waitFor();
    await d.getByRole("button", { name: /进入下个月|查看年终结算/ }).click();
  }
}

// Each clip calls mark() when the interesting part begins; everything before it is trimmed from the GIF.
const clips = {
  "game-round": async (page, mark) => {
    await page.goto(`${base}/play/2015`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: /开始第 1 回合/ }).click();
    mark();
    await page.waitForTimeout(1500);
    for (const [id, v] of [["sh50", "30"], ["cyb", "25"], ["bank", "10"], ["baijiu", "5"], ["cash", "10"], ["margin", "20"]]) {
      await page.getByLabel(`${{ sh50: "上证50 ETF", cyb: "创业板 ETF", bank: "银行板块", baijiu: "白酒板块", cash: "货币基金", margin: "融资加杠杆" }[id]} 百分比`).fill(v);
      await page.waitForTimeout(250);
    }
    await page.getByRole("button", { name: /进入下个月/ }).first().click();
    await page.getByRole("dialog", { name: "本月结算" }).waitFor();
    await page.waitForTimeout(2500);
  },
  "persona-card": async (page, mark) => {
    await page.goto(`${base}/play/2015`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: /开始第 1 回合/ }).click();
    await playRounds(page, 12);
    await page.waitForURL(/\/result/);
    mark();
    await page.waitForTimeout(1200);
    await page.getByTestId("persona-card").scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);
  },
  "music-duet": async (page, mark) => {
    await page.goto(`${base}/play/2015`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: /开始第 1 回合/ }).click();
    await playRounds(page, 12);
    await page.waitForURL(/\/result/);
    await page.getByRole("button", { name: /听听你的 2015/ }).click();
    mark();
    await page.getByRole("button", { name: "播放" }).click();
    await page.getByRole("button", { name: "切换速度" }).click();
    await page.waitForTimeout(6500);
  },
};

const browser = await chromium.launch({ channel: "chrome" });
for (const [name, run] of Object.entries(clips)) {
  const tmp = mkdtempSync(join(tmpdir(), "kline-gif-"));
  const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: tmp, size } });
  const page = await ctx.newPage();
  const t0 = Date.now();
  let startMs = 0;
  await run(page, () => (startMs = Date.now() - t0));
  await ctx.close();
  const webm = join(tmp, readdirSync(tmp).find((f) => f.endsWith(".webm")));
  const gif = join(outDir, `${name}.gif`);
  // Two-pass palette keeps the dark UI from banding; 10 fps / 560 px wide keeps each GIF small.
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", (startMs / 1000).toFixed(2), "-i", webm, "-vf", "fps=10,scale=560:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=bayer:bayer_scale=5", "-t", "6", gif]);
  rmSync(tmp, { recursive: true, force: true });
  console.log("wrote", gif);
}
await browser.close();
