import { describe, expect, it } from "vitest";
import { allCash, playAll } from "../engine";
import { APPENDIX_B } from "../fixtures";
import { addRecord, buildReport, clearRecords, loadRecords, parseRecords, recordFor, recordGame, reportLines, STATS_KEY, tally, MAX_RECORDS, type StatsRecord } from "../stats";
import { getScript } from "@/lib/scripts";
import type { Script } from "../types";

const s2015 = getScript("2015") as Script;

function memStore(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
const rec = (code: string, ret: number, marketRet = 0.1, scriptId = "2015", extra: Partial<StatsRecord> = {}): StatsRecord => ({ code, scriptId, ret, marketRet, busted: false, liquidated: false, at: 1, ...extra });

describe("buildReport", () => {
  it("matches the appendix B reference play", () => {
    const r = buildReport(s2015, playAll(s2015, APPENDIX_B));
    expect(r.months).toBe(12);
    expect(r.finalValue).toBeCloseTo(174293.31, 1);
    expect(r.ret).toBeCloseTo(0.7429331, 6);
    expect(r.rankId).toBe("legend");
    expect(r.excess).toBeCloseTo(r.ret - r.marketRet, 12);
    expect(r.winMonths + r.loseMonths).toBeLessThanOrEqual(12);
    expect(r.best!.pnl).toBeGreaterThanOrEqual(r.worst!.pnl);
    expect(r.liquidatedMonths).toEqual([]);
  });

  it("all cash: every month is a (tiny) win and the return is the cash return", () => {
    const r = buildReport(s2015, playAll(s2015, Array.from({ length: 12 }, allCash)));
    expect(r.ret).toBeCloseTo(1.003 ** 12 - 1, 10);
    expect(r.winMonths).toBe(12);
    expect(r.loseMonths).toBe(0);
    expect(r.cashRet).toBeCloseTo(r.ret, 10);
  });

  it("empty history is a neutral report", () => {
    const r = buildReport(s2015, []);
    expect(r).toMatchObject({ months: 0, ret: 0, best: null, worst: null, busted: false });
  });

  it("lines mention the key facts", () => {
    const lines = reportLines(buildReport(s2015, playAll(s2015, APPENDIX_B)));
    expect(lines[0]).toContain("+74.3%");
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });
});

describe("tally", () => {
  it("empty list gives zeros, not NaN", () => {
    const t = tally([]);
    expect(t).toMatchObject({ games: 0, winRate: 0, avgReturn: 0, bestReturn: 0, worstReturn: 0, beatMarketRate: 0 });
  });

  it("computes win rate, average and per-script numbers", () => {
    const t = tally([rec("a", 0.2), rec("b", -0.1), rec("c", 0.05, 0.3, "2008"), rec("d", -0.6, 0.1, "2008", { busted: true, liquidated: true })]);
    expect(t.games).toBe(4);
    expect(t.winRate).toBe(0.5);
    expect(t.beatMarketRate).toBe(0.25); // only "a" beats its market
    expect(t.avgReturn).toBeCloseTo((0.2 - 0.1 + 0.05 - 0.6) / 4, 12);
    expect(t.bestReturn).toBe(0.2);
    expect(t.worstReturn).toBe(-0.6);
    expect(t.busts).toBe(1);
    expect(t.liquidations).toBe(1);
    expect(t.byScript.map((s) => s.scriptId)).toEqual(["2008", "2015"]);
    expect(t.byScript[1]).toMatchObject({ games: 2, bestReturn: 0.2 });
    expect(t.byScript[1].avgReturn).toBeCloseTo(0.05, 12);
  });

  it("a flat game (ret 0) is not a win", () => {
    expect(tally([rec("a", 0)]).winRate).toBe(0);
  });
});

describe("storage", () => {
  it("dedupes by result code and returns the same array when unchanged", () => {
    const one = addRecord([], rec("a", 0.1));
    expect(addRecord(one, rec("a", 0.9))).toBe(one);
    expect(addRecord(one, rec("b", 0.9))).toHaveLength(2);
  });

  it("keeps at most MAX_RECORDS, dropping the oldest", () => {
    let list: StatsRecord[] = [];
    for (let i = 0; i < MAX_RECORDS + 5; i++) list = addRecord(list, rec(`c${i}`, 0.1));
    expect(list).toHaveLength(MAX_RECORDS);
    expect(list[0].code).toBe("c5");
  });

  it("recordGame persists once and survives a reload", () => {
    const st = memStore();
    const r = recordFor(s2015, playAll(s2015, APPENDIX_B), "code1", 123);
    recordGame(r, st);
    recordGame(r, st);
    expect(loadRecords(st)).toEqual([r]);
    expect(tally(loadRecords(st)).games).toBe(1);
    clearRecords(st);
    expect(loadRecords(st)).toEqual([]);
  });

  it("corrupt storage yields an empty list, bad rows are dropped", () => {
    expect(parseRecords("{not json")).toEqual([]);
    expect(parseRecords('{"a":1}')).toEqual([]);
    expect(parseRecords(JSON.stringify([rec("a", 0.1), { code: "x" }, null]))).toHaveLength(1);
    expect(loadRecords(memStore({ [STATS_KEY]: "garbage" }))).toEqual([]);
  });

  it("a throwing storage never throws", () => {
    const bad = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {
        throw new Error("x");
      },
    };
    expect(loadRecords(bad)).toEqual([]);
    expect(() => recordGame(rec("a", 0.1), bad)).not.toThrow();
    expect(() => clearRecords(bad)).not.toThrow();
  });
});
