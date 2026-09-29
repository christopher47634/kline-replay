// Frame-time analysis under a 4x CPU slowdown (mid-range Android stand-in). Usage: node scripts/analyze_trace.mjs [baseUrl]
// Scenarios: home scrolled for 5 s (hero + pinned story) and the settle dialog opening. rAF deltas are collected in the
// page; the report gives the share of frames over 16.7 ms, p95 frame time and average fps. Budget: >= 45 fps average.
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3217";
const browser = await chromium.launch({ channel: "chrome", args: ["--use-angle=default", "--ignore-gpu-blocklist"] });

async function measure(name, viewport, scenario) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await scenario.setup?.(page);
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const loop = (t) => {
      window.__frames.push(t - last);
      last = t;
      window.__probe = requestAnimationFrame(loop);
    };
    window.__probe = requestAnimationFrame(loop);
  });
  await scenario.run(page);
  const frames = await page.evaluate(() => {
    cancelAnimationFrame(window.__probe);
    return window.__frames.slice(2);
  });
  const sorted = [...frames].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
  const long = frames.filter((f) => f > 16.7 * 1.5).length / frames.length;
  console.log(`${name.padEnd(28)} frames ${String(frames.length).padStart(4)} | avg ${(1000 / avg).toFixed(1)} fps | p95 ${p95.toFixed(1)} ms | >25 ms: ${(long * 100).toFixed(1)}%`);
  await ctx.close();
  return 1000 / avg;
}

const results = [];
results.push(
  await measure("home: 5 s scroll (desktop)", { width: 1440, height: 900 }, {
    setup: async (p) => {
      await p.goto(base);
      await p.waitForTimeout(3000);
    },
    run: async (p) => {
      for (let i = 0; i < 25; i++) {
        await p.mouse.wheel(0, 260);
        await p.waitForTimeout(200);
      }
    },
  }),
);
results.push(
  await measure("home: 5 s scroll (phone)", { width: 390, height: 844 }, {
    setup: async (p) => {
      await p.goto(base);
      await p.waitForTimeout(3000);
    },
    run: async (p) => {
      for (let i = 0; i < 25; i++) {
        await p.evaluate(() => window.scrollBy(0, 200));
        await p.waitForTimeout(200);
      }
    },
  }),
);
results.push(
  await measure("settle dialog opening", { width: 1440, height: 900 }, {
    setup: async (p) => {
      await p.goto(`${base}/play/2015`);
      await p.evaluate(() => localStorage.clear());
      await p.reload();
      await p.getByRole("button", { name: /开始第 1 回合/ }).click();
      await p.waitForTimeout(1500);
      await p.getByRole("button", { name: "平均分配" }).click();
    },
    run: async (p) => {
      await p.getByTestId("next-month").click();
      await p.getByRole("dialog", { name: "本月结算" }).waitFor();
      await p.waitForTimeout(2500);
    },
  }),
);
await browser.close();
const bad = results.filter((f) => f < 45);
console.log(bad.length ? `BELOW 45 fps in ${bad.length} scenario(s)` : "all scenarios >= 45 fps average");
process.exit(bad.length ? 1 : 0);
