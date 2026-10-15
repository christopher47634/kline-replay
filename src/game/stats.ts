import { benchmarks, isBusted, everLiquidated, playAll, rank, totalReturn } from "./engine";
import type { Allocation, RankId, RoundRecord, Script } from "./types";

/** Pure functions for the post-game review report and the cross-game tally. Storage is injected so tests need no DOM. */

export const STATS_KEY = "kline-replay:stats:v1";
export const MAX_RECORDS = 200;

/** 一局的复盘报告（全部由 script + history 重新算出，不信任别处）。 */
export interface GameReport {
  scriptId: string;
  months: number;
  finalValue: number;
  ret: number;
  marketRet: number;
  cashRet: number;
  /** ret - marketRet */
  excess: number;
  winMonths: number;
  loseMonths: number;
  /** 0-based month index and its pnl; null if no month was played */
  best: { month: number; pnl: number } | null;
  worst: { month: number; pnl: number } | null;
  liquidatedMonths: number[];
  busted: boolean;
  rankId: RankId;
  beatMarket: boolean;
}

export function buildReport(script: Script, history: RoundRecord[]): GameReport {
  const ret = totalReturn(script, history);
  const b = benchmarks(script, history);
  const marketRet = b.market[b.market.length - 1] / script.startCash - 1;
  const cashRet = b.cash[b.cash.length - 1] / script.startCash - 1;
  const busted = isBusted(history);
  let best: GameReport["best"] = null;
  let worst: GameReport["worst"] = null;
  for (const h of history) {
    if (!best || h.pnl > best.pnl) best = { month: h.month, pnl: h.pnl };
    if (!worst || h.pnl < worst.pnl) worst = { month: h.month, pnl: h.pnl };
  }
  return {
    scriptId: script.id,
    months: history.length,
    finalValue: history.length ? history[history.length - 1].cashAfter : script.startCash,
    ret,
    marketRet,
    cashRet,
    excess: ret - marketRet,
    winMonths: history.filter((h) => h.pnl > 0).length,
    loseMonths: history.filter((h) => h.pnl < 0).length,
    best,
    worst,
    liquidatedMonths: history.filter((h) => h.liquidated).map((h) => h.month),
    busted,
    rankId: rank(ret, busted).id,
    beatMarket: ret > marketRet,
  };
}

export function reportFromAllocs(script: Script, allocs: Allocation[]): GameReport {
  return buildReport(script, playAll(script, allocs));
}

/** 本局复盘的几句话。 */
export function reportLines(r: GameReport, monthLabel: (month: number) => string = (m) => `第 ${m + 1} 月`): string[] {
  const p = (x: number) => `${x > 0 ? "+" : x < 0 ? "-" : ""}${Math.abs(x * 100).toFixed(1)}%`;
  const lines = [`年度收益 ${p(r.ret)}，${r.beatMarket ? "跑赢" : "没跑赢"}满仓大盘（${p(r.marketRet)}）${Math.abs(r.excess * 100).toFixed(1)} 个百分点。`];
  lines.push(`${r.months} 个月里赚 ${r.winMonths} 个月、亏 ${r.loseMonths} 个月。`);
  if (r.best && r.worst) lines.push(`最好的月份 ${monthLabel(r.best.month)}（${p(r.best.pnl)}），最差的月份 ${monthLabel(r.worst.month)}（${p(r.worst.pnl)}）。`);
  if (r.liquidatedMonths.length) lines.push(`融资强平 ${r.liquidatedMonths.length} 次（${r.liquidatedMonths.map(monthLabel).join("、")}）${r.busted ? "，账户归零。" : "。"}`);
  return lines;
}

/** 累计战绩里存的一条：只留聚合需要的字段，用结果码去重。 */
export interface StatsRecord {
  code: string;
  scriptId: string;
  ret: number;
  marketRet: number;
  busted: boolean;
  liquidated: boolean;
  at: number;
}

export function toRecord(code: string, r: GameReport, liquidated: boolean, at: number): StatsRecord {
  return { code, scriptId: r.scriptId, ret: r.ret, marketRet: r.marketRet, busted: r.busted, liquidated, at };
}

export const recordFor = (script: Script, history: RoundRecord[], code: string, at: number): StatsRecord =>
  toRecord(code, buildReport(script, history), everLiquidated(history), at);

/** Adds a record unless that result code is already there. Returns the same array when nothing changed. */
export function addRecord(records: StatsRecord[], rec: StatsRecord): StatsRecord[] {
  if (records.some((x) => x.code === rec.code)) return records;
  return [...records, rec].slice(-MAX_RECORDS);
}

export interface ScriptTally {
  scriptId: string;
  games: number;
  avgReturn: number;
  bestReturn: number;
}

export interface Tally {
  games: number;
  /** share of games with ret > 0 */
  winRate: number;
  /** share of games that beat the full-position market */
  beatMarketRate: number;
  avgReturn: number;
  bestReturn: number;
  worstReturn: number;
  busts: number;
  liquidations: number;
  byScript: ScriptTally[];
}

export function tally(records: StatsRecord[]): Tally {
  const n = records.length;
  const sum = (f: (r: StatsRecord) => number) => records.reduce((s, r) => s + f(r), 0);
  const byId = new Map<string, StatsRecord[]>();
  for (const r of records) byId.set(r.scriptId, [...(byId.get(r.scriptId) ?? []), r]);
  return {
    games: n,
    winRate: n ? records.filter((r) => r.ret > 0).length / n : 0,
    beatMarketRate: n ? records.filter((r) => r.ret > r.marketRet).length / n : 0,
    avgReturn: n ? sum((r) => r.ret) / n : 0,
    bestReturn: n ? Math.max(...records.map((r) => r.ret)) : 0,
    worstReturn: n ? Math.min(...records.map((r) => r.ret)) : 0,
    busts: records.filter((r) => r.busted).length,
    liquidations: records.filter((r) => r.liquidated).length,
    byScript: [...byId.entries()]
      .map(([scriptId, rs]) => ({
        scriptId,
        games: rs.length,
        avgReturn: rs.reduce((s, r) => s + r.ret, 0) / rs.length,
        bestReturn: Math.max(...rs.map((r) => r.ret)),
      }))
      .sort((x, y) => x.scriptId.localeCompare(y.scriptId)),
  };
}

const isRecord = (x: unknown): x is StatsRecord => {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.code === "string" &&
    typeof r.scriptId === "string" &&
    Number.isFinite(r.ret) &&
    Number.isFinite(r.marketRet) &&
    typeof r.busted === "boolean" &&
    typeof r.liquidated === "boolean" &&
    Number.isFinite(r.at)
  );
};

/** Tolerant parse: anything corrupt yields [] or drops the bad rows. */
export function parseRecords(raw: string | null | undefined): StatsRecord[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter(isRecord).slice(-MAX_RECORDS) : [];
  } catch {
    return [];
  }
}

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function loadRecords(storage: KV | undefined = safeStorage()): StatsRecord[] {
  try {
    return parseRecords(storage?.getItem(STATS_KEY));
  } catch {
    return [];
  }
}

/** Saves a finished game once; returns the full list afterwards. Storage failures are swallowed (private mode). */
export function recordGame(rec: StatsRecord, storage: KV | undefined = safeStorage()): StatsRecord[] {
  const cur = loadRecords(storage);
  const next = addRecord(cur, rec);
  if (next !== cur) {
    try {
      storage?.setItem(STATS_KEY, JSON.stringify(next));
    } catch { /* storage full or disabled */ }
  }
  return next;
}

export function clearRecords(storage: KV | undefined = safeStorage()): void {
  try {
    storage?.removeItem(STATS_KEY);
  } catch { /* ignore */ }
}

function safeStorage(): KV | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
