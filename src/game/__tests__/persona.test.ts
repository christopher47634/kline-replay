import { describe, expect, it } from "vitest";
import { allCash, playAll } from "../engine";
import { APPENDIX_B } from "../fixtures";
import { judgePersona, keyMoves, pickQuote, PERSONAS } from "../persona";
import { getScript } from "@/lib/scripts";
import type { Allocation, Script } from "../types";

const s = getScript("2015") as Script; // peakMonth 4, troughMonth 8
const A = (p: Partial<Allocation>): Allocation => ({ sh50: 0, cyb: 0, bank: 0, baijiu: 0, cash: 0, margin: 0, ...p });
const judge = (allocs: Allocation[]) => judgePersona(playAll(s, allocs), s);
const flat = (a: Allocation) => Array.from({ length: 12 }, () => a);

describe("judgePersona", () => {
  it("script peak/trough are what the fixtures assume", () => {
    expect(s.peakMonth).toBe(4);
    expect(s.troughMonth).toBe(8);
  });

  it("leverage_maniac: margin >= 30 in 4+ months", () => {
    const allocs = flat(A({ cash: 100 }));
    for (const m of [0, 1, 2, 3]) allocs[m] = A({ sh50: 60, margin: 40 });
    expect(judge(allocs)).toBe("leverage_maniac");
  });

  it("top_escaper: appendix B play", () => {
    expect(judge(APPENDIX_B)).toBe("top_escaper");
  });

  it("bottom_hunter: jumps into high risk at the trough", () => {
    const allocs = flat(A({ cash: 100 }));
    allocs[8] = A({ cyb: 40, cash: 60 });
    expect(judge(allocs)).toBe("bottom_hunter");
  });

  it("chaser: adds high risk after two up months, twice", () => {
    // market up in Feb, Mar, Apr, so months 3 and 4 each follow two up months
    const allocs = flat(A({ cash: 100 }));
    allocs[3] = A({ cyb: 20, cash: 80 });
    for (let m = 4; m < 12; m++) allocs[m] = A({ cyb: 40, cash: 60 });
    expect(judge(allocs)).toBe("chaser");
  });

  it("scared_bird: retreats to cash after losing months, twice", () => {
    // Jan sh50 -9% -> Feb all cash; Jul loss -> Aug all cash
    const allocs = flat(A({ sh50: 100 }));
    allocs[1] = A({ cash: 100 });
    allocs[7] = A({ cash: 100 });
    expect(judge(allocs)).toBe("scared_bird");
  });

  it("diamond_hands: never moves more than 10", () => {
    expect(judge(flat(A({ sh50: 50, bank: 50 })))).toBe("diamond_hands");
  });

  it("drifter: default", () => {
    const allocs = Array.from({ length: 12 }, (_, i) => (i % 2 ? A({ bank: 60, cash: 40 }) : A({ baijiu: 60, cash: 40 })));
    expect(judge(allocs)).toBe("drifter");
  });

  it("quote is deterministic and belongs to the persona", () => {
    const h = playAll(s, APPENDIX_B);
    expect(pickQuote("top_escaper", h)).toBe(pickQuote("top_escaper", h));
    expect(PERSONAS.top_escaper.quotes).toContain(pickQuote("top_escaper", h));
  });

  it("keyMoves returns three highlights", () => {
    const moves = keyMoves(playAll(s, APPENDIX_B), s);
    expect(moves.map((m) => m.label)).toEqual(["最大加仓", "最大减仓", "最高风险"]);
    expect(moves[2].month).toBe(4);
    const none = keyMoves(playAll(s, flat(allCash())), s);
    expect(none[0].text).toBe("全年没加过仓");
    expect(none[1].text).toBe("全年没减过仓");
    // plain-language templates: "N 月，把 X% 的钱押进…" / "N 月，一口气清掉 X% 的风险仓位"
    expect(moves[0].text).toMatch(/^\d+ 月，把 \d+% 的钱押进.+/);
    expect(moves[1].text).toMatch(/^\d+ 月，一口气清掉 \d+% 的风险仓位$/);
  });
});
