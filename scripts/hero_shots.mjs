// Hero screenshots at several times, plus the static fallback image. Usage: node scripts/hero_shots.mjs [fallback]
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://localhost:3217";
const out = "docs/screenshots/v3";
const browser = await chromium.launch({ channel: "chrome", args: ["--use-angle=default", "--enable-gpu-rasterization", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
await page.goto(base);
for (const [label, ms] of [["0.8s", 800], ["2s", 1200], ["6s", 4000]]) {
  await page.waitForTimeout(ms);
  console.log(label, await page.locator("[data-hero-mode]").getAttribute("data-hero-mode"));
  await page.screenshot({ path: `${out}/home-hero-${label}.png` });
}
if (process.argv[2] === "fallback") {
  // The static fallback is the bare particle field: hide the copy, wait for the playhead to finish, shoot 1920x1080.
  const p2 = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  await p2.goto(base);
  await p2.addStyleTag({ content: ".relative.z-10, [data-scrim], .hero-scroll-hint, .grain, footer, button { visibility: hidden !important; }" });
  await p2.waitForTimeout(12500);
  await p2.screenshot({ path: "scripts/.cache/hero-raw.png" });
  console.log("wrote scripts/.cache/hero-raw.png");
}
console.log(errs.length ? errs.join("\n") : "no pageerrors");
await browser.close();
