import { describe, expect, it } from "vitest";
import { compose, composePhrase, levelIndex, MAJOR, MINOR, shiftOctave, velocityOf } from "../compose";
import { playAll, simulateDaily } from "@/game/engine";
import { APPENDIX_B } from "@/game/fixtures";
import { getScript } from "@/lib/scripts";
import type { DailyPoint, RoundRecord, Script } from "@/game/types";

const s = getScript("2015") as Script;

function curve(values: number[], market = 100000): DailyPoint[] {
  return values.map((v, i) => ({
    date: `2015-01-${String(i + 1).padStart(2, "0")}`,
    month: Math.floor(i / 20),
    value: v,
    marketValue: market,
    r: i === 0 ? 0 : v / values[i - 1] - 1,
    marketR: 0,
    liquidated: false,
  }));
}

describe("compose", () => {
  it("1. a monotonically rising curve never lowers the pitch", () => {
    const values = Array.from({ length: 120 }, (_, i) => 100000 * (1 + i * 0.004));
    const { notes } = compose(curve(values), [], 100000);
    for (let i = 1; i < notes.length; i++) expect(notes[i].idx).toBeGreaterThanOrEqual(notes[i - 1].idx);
    expect(notes.at(-1)!.idx).toBeGreaterThan(notes[0].idx);
  });

  it("2. finishing below the start uses the A minor pentatonic", () => {
    const values = Array.from({ length: 40 }, (_, i) => 100000 * (1 - i * 0.005));
    const c = compose(curve(values), [], 100000);
    expect(c.major).toBe(false);
    expect(c.scale).toBe(MINOR);
    expect(c.notes[0].pitch).toBe(MINOR[7]);
  });

  it("3. one switch cymbal per month whose allocation changed", () => {
    const history = playAll(s, APPENDIX_B);
    const changed = history.filter((h, i) => i > 0 && JSON.stringify(h.alloc) !== JSON.stringify(history[i - 1].alloc)).length;
    const { notes } = compose(simulateDaily(history, s), history, s.startCash);
    const switches = notes.flatMap((n) => n.perc).filter((p) => p.kind === "switch");
    expect(changed).toBe(4); // May, June, July, October in Appendix B
    expect(switches).toHaveLength(changed);
    expect(switches.every((p) => p.voice === "cymbal" && p.velocity === 0.6)).toBe(true);
  });

  it("4. one note per trading day", () => {
    const history = playAll(s, APPENDIX_B);
    const daily = simulateDaily(history, s);
    const days = s.months.reduce((n, m) => n + m.daily.length, 0);
    expect(compose(daily, history, s.startCash).notes).toHaveLength(days);
  });

  it("liquidation day gets a triple low drum", () => {
    const history: RoundRecord[] = [];
    const pts = curve([100000, 90000, 60000]);
    pts[2].liquidated = true;
    const perc = compose(pts, history, 100000).notes[2].perc;
    expect(perc).toContainEqual({ kind: "liquidation", voice: "kick", velocity: 1, hits: 3 });
  });

  it("never asks one voice to overlap itself: kick hits <= 3, at most one cymbal per note", () => {
    const history = playAll(s, APPENDIX_B);
    const daily = simulateDaily(history, s);
    for (const n of compose(daily, history, s.startCash).notes) {
      expect(n.perc.filter((p) => p.voice === "cymbal").length).toBeLessThanOrEqual(2);
      for (const p of n.perc) if (p.voice === "kick") expect(p.hits).toBeLessThanOrEqual(3);
    }
  });

  it("mapping helpers", () => {
    expect(levelIndex(-0.9)).toBe(0);
    expect(levelIndex(0)).toBe(7);
    expect(levelIndex(0.9)).toBe(14);
    expect(velocityOf(0)).toBeCloseTo(0.4);
    expect(velocityOf(-0.08)).toBeCloseTo(1);
    expect(shiftOctave("A4", -2)).toBe("A2");
  });

  it("composePhrase: one lead note per day, major when the run ends up, minor when down, no perc/bass", () => {
    const up = composePhrase([101, 103, 102, 108], 100);
    expect(up.major).toBe(true);
    expect(up.notes).toHaveLength(4);
    expect(up.notes.every((n) => MAJOR.includes(n.pitch))).toBe(true);
    expect(up.notes[3].idx).toBeGreaterThan(up.notes[0].idx);
    const down = composePhrase([99, 95, 90, 85], 100);
    expect(down.major).toBe(false);
    expect(down.notes.every((n) => MINOR.includes(n.pitch))).toBe(true);
    expect(down.notes[3].idx).toBeLessThan(down.notes[0].idx);
    expect(Object.keys(up.notes[0]).sort()).toEqual(["i", "idx", "pitch", "r", "value", "velocity"]);
  });
});
