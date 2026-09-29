// Records a raw ~3 minute walkthrough for the demo video. Narration and cutting are up to a human.
// Usage: node scripts/record_demo.mjs [baseUrl]   (needs a running server; Playwright's ffmpeg:
//   `npx playwright install ffmpeg`, set PLAYWRIGHT_BROWSERS_PATH to keep it off the C drive)
// Output: demo/raw.webm and demo/shots.json (shot list with start second + suggested narration cue)
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3217";
mkdirSync("demo", { recursive: true });
const size = { width: 1280, height: 720 };
const tmp = mkdtempSync(join(tmpdir(), "kline-demo-"));
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: tmp, size } });
const page = await ctx.newPage();
const t0 = Date.now();
const shots = [];
const shot = async (name, cue, holdMs) => {
  shots.push({ name, cue, start: +((Date.now() - t0) / 1000).toFixed(1) });
  await page.waitForTimeout(holdMs);
};
const settle = async () => {
  await page.getByRole("button", { name: /进入下个月|结算最后一个月/ }).first().click();
  const d = page.getByRole("dialog", { name: "本月结算" });
  await d.waitFor();
  return d;
};

// 1. home
await page.goto(base);
await page.evaluate(() => localStorage.clear());
await page.reload();
await shot("首页", "一句话：回到 2015 年 6 月，沪指 5178 点，如果是你，跑不跑？", 7000);
await page.getByRole("link", { name: "开始穿越" }).click();
await shot("开场", "带 10 万元虚拟资金回到 2015 年元旦", 5000);
await page.getByRole("button", { name: /开始第 1 回合/ }).click();

// 2. round 1: read, allocate, settle
await shot("第 1 回合：读头条", "三条头条加一条小道消息；走势图左边是开局前两个月，右边是被遮住的未来", 9000);
for (const [label, v] of [["上证50 ETF", "30"], ["创业板 ETF", "25"], ["银行板块", "10"], ["白酒板块", "5"], ["货币基金", "10"], ["融资加杠杆", "20"]]) {
  await page.getByLabel(`${label} 百分比`).fill(v);
  await page.waitForTimeout(400);
}
await shot("分配仓位", "六种资产自由配比，融资加杠杆是两倍杠杆，亏一半强平", 4000);
const d1 = await settle();
await shot("月度结算", "用真实月收益结算，给出各资产贡献、事后复盘和老股民点评", 9000);
await d1.getByRole("button", { name: /进入下个月/ }).click();

// 3. historical moment card
await page.getByTestId("moment-card").waitFor();
await shot("历史时刻", "遇到关键日期会插一张历史时刻卡，选择只预填仓位", 9000);
await page.getByRole("button", { name: "减半仓" }).click();
await shot("预填后的仓位", "选完减半仓，仓位面板已经预填好，仍然可以自己改", 5000);

// 4. fast-forward the remaining rounds
for (let m = 1; m < 12; m++) {
  if (await page.getByTestId("moment-card").isVisible().catch(() => false)) await page.getByRole("button", { name: "不动" }).click();
  await page.getByRole("button", { name: "平均分配" }).click();
  const d = await settle();
  await page.waitForTimeout(700);
  await d.getByRole("button", { name: /进入下个月|查看年终结算/ }).click();
  await page.waitForTimeout(300);
}

// 5. result
await page.waitForURL(/\/result/);
await shot("结算页", "12 个月后：收益、段位，和满仓大盘、全程现金、散户平均的对比", 10000);
await page.getByTestId("persona-card").scrollIntoViewIfNeeded();
await shot("投资人格", "七种投资人格，每张卡有三个关键操作", 8000);

// 6. music
await page.getByRole("button", { name: /听听你的 2015/ }).click();
await shot("音乐二重奏", "红线是你，灰线是大盘，每个交易日一个音，强平时三声低鼓", 1000);
await page.getByRole("button", { name: "播放" }).click();
await page.getByRole("button", { name: "切换速度" }).click();
await page.waitForFunction(() => window.__klineMusic && window.__klineMusic.position >= window.__klineMusic.length - 1, null, { timeout: 60000 });
await shot("音乐定格", "播完定格：你的 2015 跑赢或跑输大盘多少个百分点", 5000);
await page.getByRole("button", { name: "关闭" }).click();

// 7. event mode
await page.goto(`${base}/events`);
await shot("大事件猜涨跌", "第二种玩法：3 分钟一局，抽 10 张历史事件卡，猜之后 20 个交易日涨还是跌", 6000);
await page.getByRole("link", { name: /A 股经典时刻/ }).click();
await page.getByRole("button", { name: "开始" }).click();
for (let n = 0; n < 3; n++) {
  await shot(`事件卡 ${n + 1}`, "读事件、看事发前 60 个交易日，然后猜", 7000);
  await page.getByTestId(n % 2 ? "guess-down" : "guess-up").click();
  await page.getByTestId("event-reveal").waitFor({ timeout: 10000 });
  await shot(`揭晓 ${n + 1}`, "曲线逐日生长，20 个音同步响起，再告诉你当时发生了什么", 6000);
  await page.getByTestId("next-card").click();
}
await shot("结尾", "行情是真的、头条是真事假写、结果听得见。谢谢观看", 5000);

const video = page.video();
await ctx.close();
copyFileSync(await video.path(), "demo/raw.webm");
writeFileSync("demo/shots.json", JSON.stringify({ total: +((Date.now() - t0) / 1000).toFixed(1), size, shots }, null, 1));
console.log("wrote demo/raw.webm", readdirSync("demo"));
await browser.close();
