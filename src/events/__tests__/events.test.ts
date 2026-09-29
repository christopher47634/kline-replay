import { describe, expect, it } from "vitest";
import { decodeEvents, encodeEvents } from "../encode";
import { bucketOf, maxScore, outcome, pickCards, scoreCard, scoreGame, titleOf } from "../engine";
import type { Guess } from "../types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const events = [3, 7, 0, 12, 5, 9, 20, 1, 15, 8];
const guesses: Guess[] = [true, false, true, true, false, false, true, false, true, true].map((up, i) => ({ up, bucket: i % 5 }));
const plain: Guess[] = guesses.map((g) => ({ up: g.up, bucket: null }));

describe("event link encoding", () => {
  it("round-trips with and without the magnitude round", () => {
    for (const gs of [guesses, plain]) {
      const code = encodeEvents("a-share-classics", { deckNo: 0, events, guesses: gs });
      expect(code).toHaveLength(30);
      const d = decodeEvents("a-share-classics", code);
      expect(d.ok && d.events).toEqual(events);
      expect(d.ok && d.guesses).toEqual(gs);
    }
  });

  it("detects a single-character tamper at every position", () => {
    const code = encodeEvents("a-share-classics", { deckNo: 0, events, guesses });
    for (let i = 0; i < code.length; i++) {
      const bad = code.slice(0, i) + ALPHABET[(ALPHABET.indexOf(code[i]) + 1) % 64] + code.slice(i + 1);
      expect(decodeEvents("a-share-classics", bad).ok, `tamper at ${i}`).toBe(false);
    }
  });

  it("rejects another deck, wrong length and garbage", () => {
    const code = encodeEvents("a-share-classics", { deckNo: 0, events, guesses });
    expect(decodeEvents("global-black-swans", code).ok).toBe(false);
    expect(decodeEvents("a-share-classics", code.slice(0, -2)).ok).toBe(false);
    expect(decodeEvents("a-share-classics", "???").ok).toBe(false);
    expect(decodeEvents("a-share-classics", null).ok).toBe(false);
  });

  it("rejects duplicate cards", () => {
    const code = encodeEvents("a-share-classics", { deckNo: 0, events: [1, 1, 2, 3, 4, 5, 6, 7, 8, 9], guesses });
    expect(decodeEvents("a-share-classics", code).ok).toBe(false);
  });
});

describe("scoring", () => {
  it("buckets", () => {
    expect([-0.2, -0.1, -0.05, -0.03, 0, 0.03, 0.05, 0.1, 0.11].map(bucketOf)).toEqual([0, 1, 1, 2, 2, 2, 3, 3, 4]);
  });

  it("outcome reads the move from the event-day close to day 20", () => {
    const o = outcome({ before: [90, 100], after: [101, 120] });
    expect(o.ret).toBeCloseTo(0.2);
    expect(o).toMatchObject({ up: true, bucket: 4 });
  });

  it("direction +10, magnitude +5, wrong direction resets the streak", () => {
    expect(scoreCard({ up: true, bucket: null }, 0.05, 0)).toMatchObject({ points: 10, streak: 1, bonus: 0 });
    expect(scoreCard({ up: true, bucket: 3 }, 0.05, 0)).toMatchObject({ points: 15 });
    expect(scoreCard({ up: true, bucket: 3 }, -0.05, 4)).toMatchObject({ points: 0, streak: 0, bucketOk: false });
  });

  it("streak bonus starts on the 3rd correct card in a row and applies to every later card", () => {
    const rets = Array(10).fill(0.05);
    const s = scoreGame(rets, Array(10).fill({ up: true, bucket: null }));
    expect(s.cards.map((c) => c.bonus)).toEqual([0, 0, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(s.total).toBe(116);
    expect(s.total).toBe(s.max);
  });

  it("a miss in the middle restarts the streak", () => {
    const rets = [0.05, 0.05, 0.05, -0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
    const g: Guess[] = Array(10).fill({ up: true, bucket: null });
    const s = scoreGame(rets, g);
    expect(s.cards.map((c) => c.bonus)).toEqual([0, 0, 2, 0, 0, 0, 2, 2, 2, 2]);
  });

  it("max score by mode", () => {
    expect(maxScore(false)).toBe(116);
    expect(maxScore(true)).toBe(166);
  });

  it("titles cover every ratio, in both modes", () => {
    expect(titleOf(166, 166).label).toBe("市场先知");
    expect(titleOf(116, 116).label).toBe("市场先知");
    expect(titleOf(0, 166).label).toBe("反向指标");
    const labels = [0.8, 0.65, 0.5, 0.3, 0.1].map((r) => titleOf(r * 100, 100).label);
    expect(labels).toEqual(["市场先知", "老江湖", "有点感觉", "随机漫步", "反向指标"]);
  });
});

describe("pickCards", () => {
  it("returns n distinct cards and is deterministic for a seeded source", () => {
    let x = 1;
    const rand = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    const pool = Array.from({ length: 30 }, (_, i) => i);
    const a = pickCards(pool, 10, rand);
    expect(new Set(a).size).toBe(10);
    x = 1;
    expect(pickCards(pool, 10, rand)).toEqual(a);
  });

  it("does not fail on a short pool", () => {
    expect(pickCards([1, 2, 3], 10)).toHaveLength(3);
  });
});
