import {
  ASSET_IDS,
  TRADED_IDS,
  type Allocation,
  type AssetId,
  type DailyPoint,
  type Rank,
  type RoundRecord,
  type Script,
  type ScriptMonth,
  type ScriptParams,
  type SettleResult,
} from "./types";

export const MONTHS = 12;

export function allocSum(alloc: Allocation): number {
  return ASSET_IDS.reduce((s, id) => s + (alloc[id] ?? 0), 0);
}

export function assertAlloc(alloc: Allocation): void {
  for (const id of ASSET_IDS) {
    const v = alloc[id];
    if (!Number.isInteger(v) || v < 0 || v > 100) throw new Error(`invalid allocation for ${id}: ${v}`);
  }
  const sum = allocSum(alloc);
  if (sum !== 100) throw new Error(`allocation must sum to 100, got ${sum}`);
}

export const allCash = (): Allocation => ({ sh50: 0, cyb: 0, bank: 0, baijiu: 0, cash: 100, margin: 0 });

export function marginReturn(sh50: number, params: ScriptParams): number {
  return params.marginLeverage * sh50 - params.marginCostMonthly;
}

/** Monthly settlement (section 6.2). The displayed money always comes from here. */
export function settle(cash: number, alloc: Allocation, month: ScriptMonth, params: ScriptParams): SettleResult {
  assertAlloc(alloc);
  const parts = {} as Record<AssetId, number>;
  for (const id of TRADED_IDS) parts[id] = cash * (alloc[id] / 100) * (1 + month.returns[id]);
  parts.cash = cash * (alloc.cash / 100) * (1 + params.cashMonthly);
  const mRet = marginReturn(month.returns.sh50, params);
  const liquidated = alloc.margin > 0 && mRet <= params.marginLiquidation;
  parts.margin = liquidated ? 0 : cash * (alloc.margin / 100) * (1 + mRet);
  const cashAfter = ASSET_IDS.reduce((s, id) => s + parts[id], 0);
  return { cashAfter, pnl: cash > 0 ? cashAfter / cash - 1 : 0, liquidated, parts };
}

/** Replays a list of allocations against a script. Stops early if the account is wiped out. */
export function playAll(script: Script, allocs: Allocation[]): RoundRecord[] {
  const history: RoundRecord[] = [];
  let cash = script.startCash;
  for (let m = 0; m < Math.min(allocs.length, script.months.length); m++) {
    if (cash <= 0) break;
    const res = settle(cash, allocs[m], script.months[m], script.params);
    history.push({ month: m, alloc: allocs[m], cashBefore: cash, cashAfter: res.cashAfter, pnl: res.pnl, liquidated: res.liquidated });
    cash = res.cashAfter;
  }
  return history;
}

export function finalValue(script: Script, history: RoundRecord[]): number {
  return history.length ? history[history.length - 1].cashAfter : script.startCash;
}

export function totalReturn(script: Script, history: RoundRecord[]): number {
  return finalValue(script, history) / script.startCash - 1;
}

export const isBusted = (history: RoundRecord[]) => history.length > 0 && history[history.length - 1].cashAfter <= 0;
export const everLiquidated = (history: RoundRecord[]) => history.some((h) => h.liquidated);

/**
 * Daily equity curve for charts and music (section 6.3).
 * Margin liquidation is anchored to the monthly settle result so the curve never
 * contradicts the money shown in the game: if settle liquidated, the bucket is
 * zeroed on the first day it crosses the threshold (or the last day of the month).
 */
export function simulateDaily(history: RoundRecord[], script: Script): DailyPoint[] {
  const out: DailyPoint[] = [];
  const { params } = script;
  let value = script.startCash;
  let marketValue = script.startCash;
  for (const rec of history) {
    const month = script.months[rec.month];
    const n = month.daily.length;
    const buckets = {} as Record<AssetId, number>;
    for (const id of ASSET_IDS) buckets[id] = value * (rec.alloc[id] / 100);
    const marginStart = buckets.margin;
    let marginDead = false;
    month.daily.forEach((bar, d) => {
      const before = value;
      for (const id of TRADED_IDS) buckets[id] *= 1 + bar.r[id];
      buckets.cash *= 1 + params.cashMonthly / n;
      let liqToday = false;
      if (!marginDead && marginStart > 0) {
        buckets.margin *= 1 + params.marginLeverage * bar.r.sh50 - params.marginCostMonthly / n;
        const crossed = buckets.margin <= marginStart * (1 + params.marginLiquidation);
        if (rec.liquidated && (crossed || d === n - 1)) {
          buckets.margin = 0;
          marginDead = true;
          liqToday = true;
        } else if (buckets.margin < 0) {
          buckets.margin = 0;
        }
      }
      value = ASSET_IDS.reduce((s, id) => s + buckets[id], 0);
      marketValue *= 1 + bar.r.market;
      out.push({
        date: bar.date,
        month: rec.month,
        value,
        marketValue,
        r: before > 0 ? value / before - 1 : 0,
        marketR: bar.r.market,
        liquidated: liqToday,
      });
    });
    // Daily-rebalanced 2x leverage drifts from the monthly 2x the game settles with, most in wild months
    // (October 2008: 2.5%). Spread the gap geometrically over the month's days so the curve ends exactly on the
    // settled amount (no jump at the next month), then carry that figure forward.
    const first = out.length - n;
    const monthStart = first > 0 ? out[first - 1].value : script.startCash;
    if (n > 0 && value > 0 && rec.cashAfter > 0 && monthStart > 0) {
      const k = rec.cashAfter / value;
      let prev = monthStart;
      for (let j = 0; j < n; j++) {
        const p = out[first + j];
        p.value *= k ** ((j + 1) / n);
        p.r = prev > 0 ? p.value / prev - 1 : 0;
        prev = p.value;
      }
    }
    value = rec.cashAfter;
  }
  return out;
}

export interface BenchmarkSeries {
  labels: string[];
  player: number[];
  market: number[];
  cash: number[];
  retailAvg: number;
}

/** Month-end values (index 0 = start) for the player and the two passive strategies. */
export function benchmarks(script: Script, history: RoundRecord[]): BenchmarkSeries {
  const labels = ["开局", ...script.months.map((m) => `${m.index + 1}月`)];
  const player = [script.startCash];
  const market = [script.startCash];
  const cash = [script.startCash];
  for (let i = 0; i < script.months.length; i++) {
    market.push(market[i] * (1 + script.months[i].marketReturn));
    cash.push(cash[i] * (1 + script.params.cashMonthly));
    player.push(i < history.length ? history[i].cashAfter : player[i]);
  }
  return { labels, player, market, cash, retailAvg: script.benchmarks.retailAvg };
}

export const RANKS: Record<Rank["id"], Rank> = {
  liquidated: { id: "liquidated", label: "杠杆的代价", color: "#7843a9" },
  legend: { id: "legend", label: "传奇操盘手", color: "#876329" },
  winner: { id: "winner", label: "稳健赢家", color: "#bc3e49" },
  small_win: { id: "small_win", label: "小赚离场", color: "#a35b20" },
  tuition: { id: "tuition", label: "交了学费", color: "#52677b" },
  leek: { id: "leek", label: "韭菜本菜", color: "#277454" },
};

/**
 * 本局成绩. `wipedOut` = the account went to zero. A liquidation the account survived is a 特殊事件 shown next to the
 * score (persona.specialEvents), not a verdict that replaces it (v8; before that any liquidation took over the rank).
 */
export function rank(ret: number, wipedOut: boolean): Rank {
  if (wipedOut) return RANKS.liquidated;
  if (ret > 0.5) return RANKS.legend;
  if (ret > 0.2) return RANKS.winner;
  if (ret > 0) return RANKS.small_win;
  if (ret > -0.2) return RANKS.tuition;
  return RANKS.leek;
}
