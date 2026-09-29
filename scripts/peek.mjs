// Quick look: node scripts/peek.mjs <path> <out.png> [width height] [waitMs] [reduce]
import { chromium } from "@playwright/test";

const [path = "/", out = "peek.png", w = "1440", h = "900", wait = "1500", reduce] = process.argv.slice(2);
const base = process.env.BASE ?? "http://localhost:3217";
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, reducedMotion: reduce ? "reduce" : "no-preference", hasTouch: +w < 768 });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text().slice(0, 200)));
await page.goto(base + path);
await page.waitForTimeout(+wait);
await page.screenshot({ path: out, fullPage: false });
console.log(errs.length ? errs.join("\n") : "no errors");
await browser.close();
