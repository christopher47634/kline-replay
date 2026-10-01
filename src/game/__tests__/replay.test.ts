import { describe, expect, it } from "vitest";
import { allCash, playAll, settle, simulateDaily } from "@/game/engine";
import { decisionReplay } from "@/game/replay";
import { rumorFacts } from "@/game/rumor";
import { compose, highlightSegments } from "@/music/compose";
import { pickFresh } from "@/events/engine";
import { bucketsFor } from "@/events/seen";
import type { Allocation } from "@/game/types";
import { getScript, SCRIPT_IDS } from "@/lib/scripts";

const even: Allocation = { sh50: 20, cyb: 20, bank: 20, baijiu: 20, cash: 20, margin: 0 };

describe("三次关键决定回放", () => {
  it("uses the year's historical moments, tells the truth about edits, and computes a one-month counterfactual", () => {
    const s = getScript("2015")!;
    const allocs = Array.from({ length: 12 }, (_, m) => (m === 1 ? { ...even, cash: 60, cyb: 0, bank: 0 } : even));
    const h = playAll(s, allocs);
    const items = decisionReplay(s, h, { 1: { moment: 0, reason: "fear", edited: true } });
    expect(items).toHaveLength(3);
    expect(items.every((x) => x.kind === "moment")).toBe(true); // 2015 has three moments
    const feb = items.find((x) => x.month === 1)!;
    expect(feb.choice).toBe("减半仓");
    expect(feb.reason).toBe("怕继续亏");
    expect(feb.edited).toBe(true);
    // counterfactual = the same month settled with January's allocation, from the same starting cash
    const alt = settle(h[1].cashBefore, h[0].alloc, s.months[1], s.params);
    expect(feb.cf.pnl).toBeCloseTo(alt.pnl, 10);
    expect(feb.cf.same).toBe(false);
  });

  it("fills up with the biggest moves when a year has fewer moments than three, in every year", () => {
    for (const id of SCRIPT_IDS) {
      const s = getScript(id)!;
      const items = decisionReplay(s, playAll(s, Array(12).fill(even)), {});
      expect(items.length, id).toBe(3);
      expect(new Set(items.map((x) => x.month)).size).toBe(3);
      for (let k = 1; k < items.length; k++) expect(items[k].month).toBeGreaterThan(items[k - 1].month);
    }
  });
});

describe("小道消息复盘", () => {
  it("keeps 'came true', 'moved its way' and 'you acted on it' apart", () => {
    const s = getScript("2007")!;
    // May 2007: the 印花税 rumour came true, it said 'sell', yet the market rose 7% — true but the wrong way
    const f = rumorFacts(s, { month: 4, alloc: { ...allCash(), cash: 50, sh50: 50 }, allocBefore: { ...allCash(), cash: 0, sh50: 100 } });
    expect(f.came).toBe(true);
    expect(f.same).toBe(false);
    expect(f.acted).toBe("with");
  });

  it("every month of every year has a direction tag or an explicit null", () => {
    for (const id of SCRIPT_IDS) for (const m of getScript(id)!.months) expect(m.rumorCall === null || (m.rumorCall && [1, -1].includes(m.rumorCall.dir))).toBe(true);
  });

  it("2015 and 2020 no longer alternate true / false month by month", () => {
    for (const id of ["2015", "2020"]) {
      const flags = getScript(id)!.months.map((m) => (m.rumorIsSignal ? "T" : "f")).join("");
      expect(flags).not.toBe("TfTfTfTfTfTf");
    }
  });
});

describe("音乐", () => {
  it("12 秒高光: three ~4 s stretches in time order, labelled with the month's move", () => {
    const s = getScript("2008")!;
    const h = playAll(s, Array(12).fill(even));
    const d = simulateDaily(h, s);
    const segs = highlightSegments(d, h, (m) => `${m + 1} 月`);
    expect(segs).toHaveLength(3);
    expect(segs.reduce((n, g) => n + g.end - g.start, 0)).toBe(60);
    for (let k = 1; k < 3; k++) expect(segs[k].start).toBeGreaterThanOrEqual(segs[k - 1].end);
    expect(segs.some((g) => g.label.startsWith("10 月"))).toBe(true); // October 2008 is the year's biggest month
  });

  it("a year past +50% no longer flattens onto the top note", () => {
    const s = getScript("2007")!;
    const lev: Allocation = { ...allCash(), cash: 0, cyb: 50, margin: 50 };
    const h = playAll(s, Array(12).fill(lev));
    const notes = compose(simulateDaily(h, s), h, s.startCash).notes;
    const top = notes.filter((n) => n.idx === 14).length;
    expect(top / notes.length).toBeLessThan(0.2);
  });
});

describe("事件模式抽题", () => {
  it("draws unseen cards first, then missed ones", () => {
    const pool = Array.from({ length: 14 }, (_, i) => ({ id: `e${i}` }));
    const seen: Record<string, "ok" | "miss"> = {};
    for (let i = 0; i < 8; i++) seen[`e${i}`] = i < 4 ? "miss" : "ok";
    const got = pickFresh(pool, seen, 10, () => 0.3);
    expect(got.slice(0, 6).every((x) => !seen[x.id])).toBe(true);
    expect(got.slice(6, 10).every((x) => seen[x.id] === "miss")).toBe(true);
  });

  it("magnitude choices always agree with the direction", () => {
    expect(bucketsFor(true)).toEqual([2, 3, 4]);
    expect(bucketsFor(false)).toEqual([2, 1, 0]);
  });
});
