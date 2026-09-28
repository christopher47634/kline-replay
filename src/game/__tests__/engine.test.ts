import { describe, expect, it } from "vitest";
import { allCash, benchmarks, playAll, rank, settle, simulateDaily, totalReturn } from "../engine";
import { APPENDIX_B } from "../fixtures";
import { getScript } from "@/lib/scripts";
import type { Allocation, Script, ScriptMonth } from "../types";

const s2015 = getScript("2015") as Script;
const s2020 = getScript("2020") as Script;
const only = (id: keyof Allocation): Allocation => ({ ...allCash(), cash: 0, [id]: 100 });

describe("settle / playAll", () => {
  it("1. all cash for 12 months compounds at cashMonthly", () => {
    const h = playAll(s2015, Array.from({ length: 12 }, allCash));
    expect(Math.abs(h[11].cashAfter - 100000 * 1.003 ** 12)).toBeLessThan(0.01);
  });

  it("2. all sh50 equals the product of monthly sh50 returns", () => {
    const h = playAll(s2015, Array.from({ length: 12 }, () => only("sh50")));
    const expected = s2015.months.reduce((v, m) => v * (1 + m.returns.sh50), 100000);
    expect(h[11].cashAfter).toBeCloseTo(expected, 6);
  });

  it("3. throws when allocation does not sum to 100", () => {
    expect(() => settle(100000, { ...allCash(), cash: 90 }, s2015.months[0], s2015.params)).toThrow(/sum to 100/);
  });

  it("4. margin bucket is liquidated when sh50 falls 30% in a month", () => {
    const month: ScriptMonth = { ...s2015.months[0], returns: { ...s2015.months[0].returns, sh50: -0.3 } };
    const alloc: Allocation = { ...allCash(), cash: 50, margin: 50 };
    const res = settle(100000, alloc, month, s2015.params);
    expect(2 * -0.3 - 0.007).toBeCloseTo(-0.607, 10);
    expect(res.liquidated).toBe(true);
    expect(res.parts.margin).toBe(0);
    expect(res.cashAfter).toBeCloseTo(50000 * 1.003, 6);
  });

  it("5. simulateDaily month-end values stay within 2% of settle", () => {
    const plays: Allocation[][] = [
      APPENDIX_B,
      Array.from({ length: 12 }, () => ({ sh50: 20, cyb: 20, bank: 15, baijiu: 15, cash: 15, margin: 15 })),
      Array.from({ length: 12 }, () => ({ ...allCash(), cash: 50, margin: 50 })),
    ];
    for (const script of [s2015, s2020]) {
      for (const allocs of plays) {
        const h = playAll(script, allocs);
        const daily = simulateDaily(h, script);
        for (const rec of h) {
          const last = daily.filter((d) => d.month === rec.month).at(-1)!;
          expect(Math.abs(last.value / rec.cashAfter - 1)).toBeLessThan(0.02);
        }
      }
    }
  });

  it("6. appendix B fixed play matches the hand calculation", () => {
    const h = playAll(s2015, APPENDIX_B);
    expect(h).toHaveLength(12);
    // Hand-computed independently (Python) from content/scripts/2015.json
    expect(h[11].cashAfter).toBeCloseTo(174293.31, 1);
    expect(h.map((r) => Math.round(r.cashAfter))).toEqual([
      99588, 105965, 119958, 141434, 147197, 141887, 142312, 142739, 143167, 161748, 166161, 174293,
    ]);
    expect(h.some((r) => r.liquidated)).toBe(false);
  });
});

describe("benchmarks and rank", () => {
  it("market benchmark ends at the script's allInMarket", () => {
    const b = benchmarks(s2015, playAll(s2015, APPENDIX_B));
    expect(b.market[12] / 100000 - 1).toBeCloseTo(s2015.benchmarks.allInMarket, 4);
    expect(b.player).toHaveLength(13);
  });

  it("rank thresholds", () => {
    expect(rank(0.6, false).label).toBe("传奇操盘手");
    expect(rank(0.5, false).label).toBe("稳健赢家");
    expect(rank(0.2, false).label).toBe("小赚离场");
    expect(rank(0, false).label).toBe("交了学费");
    expect(rank(-0.2, false).label).toBe("韭菜本菜");
    expect(rank(0.9, true).label).toBe("杠杆的代价");
    expect(rank(totalReturn(s2015, playAll(s2015, APPENDIX_B)), false).id).toBe("legend");
  });
});
