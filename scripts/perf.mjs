// `npm run perf`: Lighthouse for the home, game (intro) and result pages, desktop + mobile, against a production build.
// Budgets = v3 plan section 7.1. Uses Lighthouse's Node API directly: `lhci autorun` cannot clean its temp
// profile on Windows (EPERM) and aborts before reporting. Exit code 1 when any budget is missed.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const PORT = 3300;
const CODE = "2015.IMgxjIMgxjIMgxjIMgxjIMgxjIMgxjIMgxjIMgxjIMgxjIMgxjIMgxjIMgxj3A";
const PAGES = [
  ["home", "/"],
  ["game", "/play/2015"],
  ["result", `/result?s=${CODE}`],
];
const BUDGET = {
  desktop: { perf: 90, a11y: 95, lcp: { home: 2500, game: 2000, result: 2000 } },
  mobile: { perf: { home: 80, game: 85, result: 85 }, a11y: 95, lcp: { home: 2500, game: 2000, result: 2000 } },
};
// Mobile = a 4G profile (9 Mbps, 100 ms RTT, 4x CPU slowdown), the "4G simulation" of plan 7.1; Lighthouse's default is the much harsher "Slow 4G".
const MOBILE_4G = { rttMs: 100, throughputKbps: 9000, requestLatencyMs: 100 * 3.75, downloadThroughputKbps: 9000 * 0.9, uploadThroughputKbps: 9000 * 0.9, cpuSlowdownMultiplier: 4 };
const chromePath = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const only = process.env.PERF_ONLY; // e.g. "home"
const out = ".lighthouseci";
mkdirSync(out, { recursive: true });

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 4000));

const rows = [];
let failed = false;
try {
  for (const form of ["desktop", "mobile"]) {
    for (const [name, path] of PAGES) {
      if (only && only !== name) continue;
      const dir = join(".lighthouseci", "profile", `${form}-${name}-${Date.now()}`);
      mkdirSync(dir, { recursive: true });
      const chrome = await chromeLauncher.launch({ chromePath, userDataDir: resolve(dir), chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"] });
      try {
        const config = form === "desktop" ? { extends: "lighthouse:default", settings: { formFactor: "desktop", screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }, throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 } } } : { extends: "lighthouse:default", settings: { throttling: MOBILE_4G } };
        const res = await lighthouse(`http://localhost:${PORT}${path}`, { port: chrome.port, hostname: "127.0.0.1", output: "json", logLevel: "error", onlyCategories: ["performance", "accessibility"] }, config);
        const lhr = res.lhr;
        writeFileSync(join(out, `${form}-${name}.json`), JSON.stringify(lhr));
        const perf = Math.round(lhr.categories.performance.score * 100);
        const a11y = Math.round(lhr.categories.accessibility.score * 100);
        const lcp = Math.round(lhr.audits["largest-contentful-paint"].numericValue);
        const cls = +lhr.audits["cumulative-layout-shift"].numericValue.toFixed(3);
        const tbt = Math.round(lhr.audits["total-blocking-time"].numericValue);
        const b = BUDGET[form];
        const perfMin = typeof b.perf === "number" ? b.perf : b.perf[name];
        const ok = perf >= perfMin && a11y >= b.a11y && lcp <= b.lcp[name] && cls <= 0.05;
        if (!ok) failed = true;
        rows.push({ form, page: name, perf, "perf≥": perfMin, a11y, lcp, cls, tbt, ok: ok ? "✓" : "✗" });
      } finally {
        try {
          await chrome.kill();
        } catch {
          /* Windows: temp profile may stay locked; harmless */
        }
        try {
          rmSync(dir, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
      }
    }
  }
} finally {
  server.kill();
}
console.table(rows);
process.exit(failed ? 1 : 0);
