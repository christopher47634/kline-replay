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
