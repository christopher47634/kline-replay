import { describe, expect, it } from "vitest";
import { settle } from "@/game/engine";
import type { Allocation, Script } from "@/game/types";
import { getScript } from "@/lib/scripts";
import { knownRows, macroFor, monthMinus } from "@/lib/macro";
import { DEFAULT_PREFS, resolve, sanitize } from "@/lib/prefs";
import { PREFS_BOOT, PREFS_KEY } from "@/lib/prefsBoot";
import { plainSettle, proSettle, settleFacts, yearFacts } from "@/lib/voice";

/** Runs the inline <head> script against a fake document and returns what it wrote. */
function boot(stored: unknown) {
  const dataset: Record<string, string> = {};
  const style: Record<string, string> = {};
  const g = globalThis as unknown as Record<string, unknown>;
  g.localStorage = { getItem: (k: string) => (k === PREFS_KEY && stored !== undefined ? JSON.stringify(stored) : null) };
  g.document = { documentElement: { dataset, style: { setProperty: (k: string, v: unknown) => (style[k] = String(v)) } } };
  new Function(PREFS_BOOT)();
  delete g.localStorage;
  delete g.document;
  return { dataset, style };
}

describe("阅读设置", () => {
  it("看不懂的值退回默认；默认是盘口", () => {
    expect(sanitize(null)).toEqual(DEFAULT_PREFS);
    expect(sanitize({ skin: "neon", font: "comic", scale: 7, glass: "x" })).toEqual(DEFAULT_PREFS);
    expect(DEFAULT_PREFS.skin).toBe("pan");
  });
  it("主题带默认字体与文风，单独设置优先", () => {
    expect(resolve(sanitize({ skin: "plain" }))).toMatchObject({ font: "kai", voice: "plain", leading: "airy" });
    expect(resolve(sanitize({ skin: "pan" }))).toMatchObject({ font: "sans", voice: "pro", leading: "compact" });
    expect(resolve(sanitize({ skin: "paper", voice: "pro", font: "serif" }))).toMatchObject({ font: "serif", voice: "pro" });
  });
  it("首帧脚本和 React 里的解析结果一致（不会先闪一种主题再换）", () => {
    const cases: unknown[] = [undefined, {}, { skin: "paper" }, { skin: "plain", font: "serif", voice: "pro", scale: 1.2, leading: "compact", glass: "off" }, { skin: "bad", scale: 9 }];
    const lh = { compact: "1.55", normal: "1.75", airy: "1.95" };
    for (const c of cases) {
      const r = resolve(sanitize(c));
      const { dataset, style } = boot(c);
      expect(dataset).toEqual({ skin: r.skin, font: r.font, voice: r.voice, glass: r.glass });
      expect(style["--fs"]).toBe(String(r.scale));
      expect(style["--lh"]).toBe(lh[r.leading]);
    }
  });
});

const EQUAL: Allocation = { sh50: 20, cyb: 15, bank: 20, baijiu: 15, cash: 15, margin: 15 };

function lastFor(script: Script, month: number, alloc: Allocation, cashBefore = script.startCash) {
  const r = settle(cashBefore, alloc, script.months[month], script.params);
  return { ...r, month, alloc, allocBefore: null, cashBefore };
}

describe("复盘文风", () => {
  const s = getScript("2015") as Script;
  it("研报归因：各资产贡献加起来就是当月盈亏", () => {
    for (let m = 0; m < 12; m++) {
      const f = settleFacts(s, lastFor(s, m, EQUAL));
      const sum = f.rows.reduce((a, r) => a + r.contrib, 0);
      expect(Math.abs(sum - f.pnl)).toBeLessThan(1e-9);
      expect(f.maxDrawdown).toBeLessThanOrEqual(0);
    }
  });
  it("2015 年 1 月平均分配：−5.2%，跑输上证 4.4 个百分点（和截图里的结算一致）", () => {
    const f = settleFacts(s, lastFor(s, 0, EQUAL));
    expect((f.pnl * 100).toFixed(1)).toBe("-5.2");
    expect(proSettle(f).conclusion).toContain("跑输大盘 4.4 个百分点");
    expect(plainSettle(f).line).toBe("这个月你亏了 5.2%，比大盘多亏 4.4 个点。");
  });
  it("白话措辞随盈亏方向变化", () => {
    const base = { rows: [], riskBefore: 0, riskAfter: 50, maxDrawdown: 0, liquidated: false };
    expect(plainSettle({ ...base, pnl: 0.05, market: 0.02, excess: 0.03 }).line).toContain("比大盘多赚 3.0 个点");
    expect(plainSettle({ ...base, pnl: 0.01, market: 0.02, excess: -0.01 }).line).toContain("比大盘少赚 1.0 个点");
    expect(plainSettle({ ...base, pnl: -0.01, market: -0.03, excess: 0.02 }).line).toContain("比大盘少亏 2.0 个点");
    expect(plainSettle({ ...base, pnl: 0, market: 0, excess: 0, rows: [] }).why).toContain("现金");
  });
  it("全年指标：胜率、最好最差月与逐月记录一致", () => {
    const hist = [];
    let cash = s.startCash;
    for (let m = 0; m < 12; m++) {
      const r = settle(cash, EQUAL, s.months[m], s.params);
      hist.push({ month: m, alloc: EQUAL, cashBefore: cash, cashAfter: r.cashAfter, pnl: r.pnl, liquidated: r.liquidated });
      cash = r.cashAfter;
    }
    const f = yearFacts(s, hist, [], 0, 0);
    expect(f.winMonths).toBe(hist.filter((h) => h.pnl > 0).length);
    expect(f.best.pnl).toBe(Math.max(...hist.map((h) => h.pnl)));
    expect(f.worst.pnl).toBe(Math.min(...hist.map((h) => h.pnl)));
    expect(f.endCash).toBe(cash);
  });
});

describe("宏观与资金面：不剧透", () => {
  it("每个回合只显示当时已经公布的月份", () => {
    for (const id of ["2015", "2020"]) {
      for (const series of macroFor(id)) {
        for (let r = 0; r < 12; r++) {
          const start = `${id}-${String(r + 1).padStart(2, "0")}`;
          for (const row of knownRows(series, id, r)) expect(row.m <= monthMinus(start, series.lag)).toBe(true);
          // PMI of the previous month is visible (published on its last day); CPI of the previous month is not yet
          if (series.id === "pmi") expect(knownRows(series, id, r).at(-1)?.m).toBe(monthMinus(start, 1));
          if (series.id === "cpi") expect(knownRows(series, id, r).at(-1)?.m).toBe(monthMinus(start, 2));
        }
      }
    }
  });
  it("数值对得上历史：2020 年 2 月 PMI 35.7，2015 年 5 月末两融余额约 2.08 万亿", () => {
    const pmi = macroFor("2020").find((x) => x.id === "pmi")!;
    expect(pmi.rows.find((r) => r.m === "2020-02")?.v).toBe(35.7);
    const margin = macroFor("2015").find((x) => x.id === "margin")!;
    expect(margin.rows.find((r) => r.m === "2015-05")?.v).toBeGreaterThan(20000);
    expect(monthMinus("2015-01", 2)).toBe("2014-11");
  });
});
