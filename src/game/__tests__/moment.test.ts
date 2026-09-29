import { describe, expect, it } from "vitest";
import { allCash, allocSum } from "../engine";
import { applyEffect } from "../moment";
import type { Allocation } from "../types";

const risky: Allocation = { sh50: 20, cyb: 30, bank: 10, baijiu: 5, cash: 5, margin: 30 };

describe("applyEffect", () => {
  it("null effect changes nothing", () => {
    expect(applyEffect(risky, null)).toEqual(risky);
  });

  it("scale 0.5 halves risky holdings into cash and still sums to 100 in steps of 5", () => {
    const a = applyEffect(risky, { scale: 0.5 });
    expect(a).toMatchObject({ sh50: 10, cyb: 15, bank: 5, baijiu: 0, margin: 15 });
    expect(a.cash).toBe(55);
    expect(allocSum(a)).toBe(100);
    for (const v of Object.values(a)) expect(v % 5).toBe(0);
  });

  it("marginPlus takes from cash first", () => {
    const a = applyEffect(allCash(), { marginPlus: 20 });
    expect(a).toMatchObject({ cash: 80, margin: 20 });
  });

  it("marginPlus falls back to trimming the biggest risky holding when cash runs short", () => {
    const a = applyEffect(risky, { marginPlus: 20 });
    expect(a.margin).toBe(50);
    expect(a.cash).toBe(0);
    expect(a.cyb).toBe(15);
    expect(allocSum(a)).toBe(100);
  });

  it("holds for every 5-step allocation of a small grid", () => {
    for (let c = 0; c <= 100; c += 25)
      for (let m = 0; m <= 100 - c; m += 25) {
        const a: Allocation = { sh50: 100 - c - m, cyb: 0, bank: 0, baijiu: 0, cash: c, margin: m };
        for (const e of [{ scale: 0.5 }, { marginPlus: 20 }, { scale: 0.5, marginPlus: 20 }]) expect(allocSum(applyEffect(a, e))).toBe(100);
      }
  });
});
