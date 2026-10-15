import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allCash, playAll, settle, totalReturn } from "../engine";
import { APPENDIX_B } from "../fixtures";
import { getScript } from "@/lib/scripts";
import type { Allocation, Script, ScriptMonth } from "../types";

/**
 * docs/REFERENCE_CASE.md: the settlement rules are locked by a case computed independently in Python
 * (scripts/reference_case.py -> docs/reference-case-2015.json). If this test fails, either the engine's
 * settlement rules changed on purpose (regenerate the json and note it in CHANGELOG.md) or it regressed.
 */
const ref = JSON.parse(readFileSync(path.resolve(__dirname, "../../../docs/reference-case-2015.json"), "utf-8")) as {
  startCash: number;
  finalValue: number;
  totalReturn: number;
  months: { month: number; cashBefore: number; cashAfter: number; liquidated: boolean }[];
};
const s = getScript("2015") as Script;

describe("reference case: 2015 + appendix B play", () => {
  const h = playAll(s, APPENDIX_B);

  it("every month matches the Python hand calculation to the cent", () => {
    expect(h).toHaveLength(ref.months.length);
    ref.months.forEach((m, i) => {
      expect(h[i].cashBefore).toBeCloseTo(m.cashBefore, 1);
      expect(h[i].cashAfter).toBeCloseTo(m.cashAfter, 1);
      expect(h[i].liquidated).toBe(m.liquidated);
    });
  });

  it("final value and total return match", () => {
    expect(h[11].cashAfter).toBeCloseTo(ref.finalValue, 1);
    expect(totalReturn(s, h)).toBeCloseTo(ref.totalReturn, 5);
  });

  it("the leveraged month (month 5, 40% margin) is settled as 2x sh50 minus 0.7% cost", () => {
    const m = s.months[4];
    const lev = 2 * m.returns.sh50 - 0.007;
    expect(lev).toBeGreaterThan(-0.5); // not liquidated in the reference play
    const a = APPENDIX_B[4];
    const before = h[4].cashBefore;
    const expected =
      before * (a.sh50 / 100) * (1 + m.returns.sh50) +
      before * (a.cyb / 100) * (1 + m.returns.cyb) +
      before * (a.margin / 100) * (1 + lev);
    expect(h[4].cashAfter).toBeCloseTo(expected, 6);
  });
});

describe("reference case: liquidation boundary", () => {
  const base = s.months[0];
  const run = (sh50: number) => {
    const month: ScriptMonth = { ...base, returns: { ...base.returns, sh50 } };
    const alloc: Allocation = { ...allCash(), cash: 50, margin: 50 };
    return settle(100000, alloc, month, s.params);
  };

  it("exactly at the threshold (2*r - 0.7% = -50%) liquidates", () => {
    expect(run(-0.2465).liquidated).toBe(true);
  });

  it("just above the threshold survives and keeps the margin bucket", () => {
    const res = run(-0.246);
    expect(res.liquidated).toBe(false);
    expect(res.parts.margin).toBeCloseTo(50000 * (1 + 2 * -0.246 - 0.007), 6);
  });

  it("liquidation zeroes only the margin bucket, cash keeps its monthly interest", () => {
    const res = run(-0.3);
    expect(res.parts.margin).toBe(0);
    expect(res.cashAfter).toBeCloseTo(50000 * 1.003, 6);
  });

  it("all cash for a month earns exactly cashMonthly", () => {
    const res = settle(100000, allCash(), base, s.params);
    expect(res.cashAfter).toBeCloseTo(100000 * 1.003, 6);
  });
});
