// Plays one event-mode game and saves the exported 战绩卡 PNG. Usage: node scripts/export_event_card.mjs <outFile> [baseUrl]
import { chromium } from "@playwright/test";

const out = process.argv[2] ?? "event-card.png";
const base = process.argv[3] ?? "http://localhost:3217";
const browser = await chromium.launch({ channel: "chrome" });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })).newPage();
await page.goto(`${base}/events/a-share-classics`);
await page.getByLabel(/进阶模式/).check();
await page.getByRole("button", { name: "开始" }).click();
for (let n = 0; n < 10; n++) {
  await page.getByTestId(n % 2 ? "guess-down" : "guess-up").click();
  await page.getByTestId("bucket-2").click();
  await page.getByTestId("event-reveal").waitFor({ timeout: 10000 });
  await page.getByTestId("next-card").click();
}
await page.waitForURL(/result/);
const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "保存战绩卡" }).click()]);
await dl.saveAs(out);
console.log("saved", out);
await browser.close();
