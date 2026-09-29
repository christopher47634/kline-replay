import { allocSum } from "./engine";
import type { Allocation, AssetId } from "./types";

export interface MomentEffect {
  /** Multiply every risky holding by this factor; the freed money goes to cash. */
  scale?: number;
  /** Move this many percentage points from cash (then from other risky holdings) into leverage. */
  marginPlus?: number;
}

export interface MomentOption {
  label: string;
  effect: MomentEffect | null;
}

export interface Moment {
  date: string;
  title: string;
  text: string;
  question: string;
  options: MomentOption[];
}

const RISKY: AssetId[] = ["sh50", "cyb", "bank", "baijiu", "margin"];
const STEP = 5;

/**
 * Pre-fills the month's draft from a choice. Narrative only: settlement rules are untouched, so a game
 * link (which stores just the final allocations) replays identically. The result always sums to 100 in steps of 5.
 */
export function applyEffect(alloc: Allocation, effect: MomentEffect | null): Allocation {
  if (!effect) return alloc;
  const a = { ...alloc };
  if (effect.scale !== undefined) {
    for (const id of RISKY) {
      const kept = Math.floor((a[id] * effect.scale) / STEP) * STEP;
      a.cash += a[id] - kept;
      a[id] = kept;
    }
  }
  if (effect.marginPlus) {
    let need = Math.floor(effect.marginPlus / STEP) * STEP;
    const fromCash = Math.min(need, a.cash);
    a.cash -= fromCash;
    a.margin += fromCash;
    need -= fromCash;
    // Not enough cash: fund the rest by trimming the largest other risky holdings.
    while (need > 0) {
      const donor = RISKY.filter((id) => id !== "margin" && a[id] > 0).sort((x, y) => a[y] - a[x])[0];
      if (!donor) break;
      const take = Math.min(need, a[donor]);
      a[donor] -= take;
      a.margin += take;
      need -= take;
    }
  }
  if (allocSum(a) !== 100) throw new Error("moment effect broke the 100% invariant");
  return a;
}
