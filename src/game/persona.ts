import personasJson from "../../content/personas.json";
import type { Allocation, AssetId, Persona, PersonaId, RoundRecord, Script } from "./types";

export const PERSONAS = personasJson as Record<PersonaId, Persona>;

export const highRisk = (a: Allocation) => a.cyb + a.margin;

/** Turnover between two allocations, 0-100. */
export function delta(a: Allocation, b: Allocation): number {
  const ids = Object.keys(a) as (keyof Allocation)[];
  return ids.reduce((s, k) => s + Math.abs(a[k] - b[k]), 0) / 2;
}

/** Ordered rules from section 7; first hit wins. */
export function judgePersona(history: RoundRecord[], script: Pick<Script, "peakMonth" | "troughMonth" | "months">): PersonaId {
  const allocs = history.map((h) => h.alloc);
  const n = allocs.length;
  const hr = allocs.map(highRisk);
  const inRange = (i: number) => i >= 1 && i < n;

  if (allocs.filter((a) => a.margin >= 30).length >= 4) return "leverage_maniac";

  for (let i = script.peakMonth - 1; i <= script.peakMonth + 1; i++) {
    if (inRange(i) && hr[i] <= 20 && hr[i - 1] >= 40) return "top_escaper";
  }

  for (let i = script.troughMonth; i <= script.troughMonth + 1; i++) {
    if (inRange(i) && hr[i] - hr[i - 1] >= 30) return "bottom_hunter";
  }

  let chase = 0;
  for (let i = 2; i < n; i++) {
    const up2 = script.months[i - 1].marketReturn > 0 && script.months[i - 2].marketReturn > 0;
    if (up2 && hr[i] - hr[i - 1] >= 20) chase++;
  }
  if (chase >= 2) return "chaser";

  let scared = 0;
  for (let i = 0; i < n - 1; i++) {
    if (history[i].pnl < 0 && allocs[i + 1].cash >= 60) scared++;
  }
  if (scared >= 2) return "scared_bird";

  if (n >= 2 && allocs.every((a, i) => i === 0 || delta(a, allocs[i - 1]) <= 10)) return "diamond_hands";

  return "drifter";
}

/** Deterministic string hash (FNV-1a) so the same game always gets the same quote. */
export function hashHistory(history: RoundRecord[]): number {
  const s = history.map((h) => Object.values(h.alloc).join(",")).join("|");
  let x = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    x ^= s.charCodeAt(i);
    x = Math.imul(x, 0x01000193) >>> 0;
  }
  return x >>> 0;
}

export function pickQuote(id: PersonaId, history: RoundRecord[]): string {
  const q = PERSONAS[id].quotes;
  return q[hashHistory(history) % q.length];
}

export interface KeyMove {
  label: string;
  month: number;
  text: string;
}

/** Three highlight moves for the persona card: biggest add, biggest cut, riskiest month. */
const SHORT: Partial<Record<AssetId, string>> = { sh50: "上证50", cyb: "创业板", bank: "银行", baijiu: "白酒", margin: "杠杆" };

/** e.g. "创业板 40% · 杠杆 40%" — the risky holdings of one month, biggest first. */
export function allocSummary(a: Allocation): string {
  const parts = (Object.keys(SHORT) as AssetId[])
    .filter((id) => a[id] > 0)
    .sort((x, y) => a[y] - a[x])
    .slice(0, 3)
    .map((id) => `${SHORT[id]} ${a[id]}%`);
  return parts.length ? parts.join(" · ") : "全部现金";
}

/** Names of the (up to two) risky assets whose weight rose the most in month `i`. */
function boughtNames(history: RoundRecord[], i: number): string {
  const prev = i === 0 ? null : history[i - 1].alloc;
  const rises = (Object.keys(SHORT) as AssetId[])
    .map((id) => ({ id, d: history[i].alloc[id] - (prev?.[id] ?? 0) }))
    .filter((x) => x.d > 0)
    .sort((a, b) => b.d - a.d)
    .slice(0, 2);
  return rises.map((x) => SHORT[x.id]).join("和") || "风险资产";
}

export function keyMoves(history: RoundRecord[], script: Pick<Script, "months">): KeyMove[] {
  if (!history.length) return [];
  const risky = history.map((h) => 100 - h.alloc.cash);
  const change = risky.map((v, i) => v - (i === 0 ? 0 : risky[i - 1]));
  const label = (m: number) => script.months[m].label.replace(/^\d+ 年 /, "");
  let addI = 0;
  let cutI = -1;
  change.forEach((c, i) => {
    if (c > change[addI]) addI = i;
    if (i > 0 && (cutI < 0 || c < change[cutI])) cutI = i;
  });
  const hr = history.map((h) => highRisk(h.alloc));
  const riskI = hr.reduce((best, v, i) => (v > hr[best] ? i : best), 0);
  const moves: KeyMove[] = [
    { label: "最大加仓", month: addI, text: change[addI] > 0 ? `${label(addI)}，把 ${change[addI]}% 的钱押进${boughtNames(history, addI)}` : "全年没加过仓" },
    {
      label: "最大减仓",
      month: Math.max(cutI, 0),
      text: cutI >= 0 && change[cutI] < 0 ? `${label(cutI)}，一口气清掉 ${-change[cutI]}% 的风险仓位` : "全年没减过仓",
    },
    { label: "最高风险", month: riskI, text: `${label(riskI)}，创业板 + 杠杆占 ${hr[riskI]}%` },
  ];
  return moves;
}
