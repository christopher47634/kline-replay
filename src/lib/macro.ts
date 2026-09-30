import macro from "../../content/data/macro.json";

/*
 * Real macro and money-flow context for a script year (content/data/macro.json, scripts/fetch_macro.mjs).
 * No look-ahead: at the start of round r (calendar month r+1) a series shows only data months that had been
 * published by then — PMI and month-end margin balance lag 1 month, CPI / PPI / M2 / new investors lag 2.
 */

export interface MacroRow {
  m: string;
  v: number;
}
export interface MacroSeries {
  id: string;
  name: string;
  unit: string;
  lag: number;
  base: number | null;
  note: string;
  rows: MacroRow[];
}

export const MACRO_FETCHED_AT: string = macro.fetchedAt;
export const MACRO_SOURCE: string = macro.source;

export function macroFor(scriptId: string): MacroSeries[] {
  return ((macro.years as Record<string, MacroSeries[]>)[scriptId] ?? []).filter((s) => s.rows.length > 0);
}

/** "2015-03" minus n months */
export function monthMinus(m: string, n: number): string {
  const [y, mo] = m.split("-").map(Number);
  const t = y * 12 + (mo - 1) - n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

/** Calendar month of round r in a script year ("2015", round 0 -> "2015-01"). */
export const roundMonth = (scriptId: string, round: number) => `${scriptId}-${String(round + 1).padStart(2, "0")}`;

/** The rows a player could have read at the start of this round. */
export function knownRows(s: MacroSeries, scriptId: string, round: number): MacroRow[] {
  const cutoff = monthMinus(roundMonth(scriptId, round), s.lag);
  return s.rows.filter((r) => r.m <= cutoff);
}

export function fmtMacro(s: MacroSeries, v: number): string {
  return `${s.id === "margin" ? v.toLocaleString("en-US") : v}${s.unit}`;
}

/*
 * Borrowed from 见微's 「换个角度看」: where the latest value sits in its own recent history (历史位置), and what
 * will be published during this month (下次验证 / 跟踪清单). The schedule is public in advance; the values are not,
 * so the calendar names the data month and the usual day but never the number.
 */

const WHEN: Record<string, string> = {
  pmi: "月末",
  cpi: "约 10 日",
  ppi: "约 10 日",
  m2: "中旬",
  margin: "每日",
  investors: "月内",
};

export interface Due {
  id: string;
  name: string;
  /** data month that gets published during this round's month */
  m: string;
  when: string;
}

/** The releases that happen during round r's calendar month: next round they become known. */
export function dueThisRound(scriptId: string, round: number): Due[] {
  return macroFor(scriptId).map((s) => {
    const next = monthMinus(roundMonth(scriptId, round), s.lag - 1);
    return { id: s.id, name: s.name, m: next, when: WHEN[s.id] ?? "月内" };
  });
}

/** 历史位置 of the latest known value among the last (up to) 12 known months; null with fewer than 4. */
export function position(rows: MacroRow[]): { n: number; text: string; tone: "hi" | "lo" | "mid" } | null {
  const w = rows.slice(-12);
  if (w.length < 4) return null;
  const v = w[w.length - 1].v;
  const n = w.length;
  const below = w.filter((r) => r.v < v).length;
  const above = w.filter((r) => r.v > v).length;
  if (above === 0 && below > 0) return { n, text: `近 ${n} 月最高`, tone: "hi" };
  if (below === 0 && above > 0) return { n, text: `近 ${n} 月最低`, tone: "lo" };
  const p = below / (n - 1);
  if (p >= 0.67) return { n, text: `近 ${n} 月偏高`, tone: "hi" };
  if (p <= 0.33) return { n, text: `近 ${n} 月偏低`, tone: "lo" };
  return { n, text: `近 ${n} 月居中`, tone: "mid" };
}
