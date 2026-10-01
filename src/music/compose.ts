import type { DailyPoint, RoundRecord } from "@/game/types";

export const MAJOR = ["C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5", "G5", "A5"];
export const MINOR = ["A2", "C3", "D3", "E3", "G3", "A3", "C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5", "G5"];

export type PercKind = "switch" | "cross" | "liquidation" | "drop";

export interface PercEvent {
  kind: PercKind;
  /** cymbal for switch/cross, low drum for liquidation/drop */
  voice: "cymbal" | "kick";
  velocity: number;
  hits: number;
}

export interface Note {
  i: number;
  date: string;
  month: number;
  /** index into the scale, 0..14 */
  idx: number;
  pitch: string;
  velocity: number;
  /** high-octave grace note on big up days */
  ornament: string | null;
  /** market bass note, once every 5 trading days */
  bass: { pitch: string; velocity: number } | null;
  perc: PercEvent[];
  value: number;
  marketValue: number;
  r: number;
  liquidated: boolean;
  /** first trading day of a month whose allocation changed */
  switched: boolean;
}

export interface Composition {
  major: boolean;
  scale: string[];
  notes: Note[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** d in [-0.5, +0.5] -> scale index [0, 14], truncated at the ends. */
export function levelIndex(d: number): number {
  return clamp(Math.round(((d + 0.5) / 1.0) * 14), 0, 14);
}

export function velocityOf(r: number): number {
  return 0.4 + (clamp(Math.abs(r), 0, 0.05) / 0.05) * 0.6;
}

export function shiftOctave(pitch: string, by: number): string {
  const m = /^([A-G]#?)(-?\d)$/.exec(pitch);
  if (!m) return pitch;
  return `${m[1]}${Number(m[2]) + by}`;
}

const sameAlloc = (a: RoundRecord["alloc"], b: RoundRecord["alloc"]) => (Object.keys(a) as (keyof typeof a)[]).every((k) => a[k] === b[k]);

export function compose(daily: DailyPoint[], history: RoundRecord[], startCash: number): Composition {
  const final = daily.at(-1)?.value ?? startCash;
  // Pitch range: ±50% spans the scale as before, but a year that goes further (2007 with leverage: +200%) widens the
  // range instead of flattening every day past +50% onto the top note.
  const span = daily.reduce((m, p) => Math.max(m, Math.abs(p.value / startCash - 1), Math.abs(p.marketValue / startCash - 1)), 0.5);
  const level = (d: number) => levelIndex((d * 0.5) / span);
  const major = final >= startCash;
  const scale = major ? MAJOR : MINOR;
  const switchedMonths = new Set(history.filter((h, i) => i > 0 && !sameAlloc(h.alloc, history[i - 1].alloc)).map((h) => h.month));
  let prevSign = 0;
  const seenMonth = new Set<number>();

  const notes = daily.map((p, i): Note => {
    let idx = level(p.value / startCash - 1);
    if (p.r > 0.03) idx = Math.min(14, idx + 1);
    if (p.r < -0.03) idx = Math.max(0, idx - 1);
    const perc: PercEvent[] = [];

    const firstDay = !seenMonth.has(p.month);
    seenMonth.add(p.month);
    const switched = firstDay && switchedMonths.has(p.month);
    if (switched) perc.push({ kind: "switch", voice: "cymbal", velocity: 0.6, hits: 1 });

    if (p.liquidated) perc.push({ kind: "liquidation", voice: "kick", velocity: 1.0, hits: 3 });
    else if (p.r <= -0.05) perc.push({ kind: "drop", voice: "kick", velocity: 0.9, hits: 1 });

    const diff = p.value - p.marketValue;
    const sign = Math.abs(diff) < 1e-6 ? 0 : Math.sign(diff);
    if (sign !== 0) {
      if (prevSign !== 0 && sign !== prevSign) perc.push({ kind: "cross", voice: "cymbal", velocity: 0.4, hits: 1 });
      prevSign = sign;
    }

    const bass =
      i % 5 === 0 ? { pitch: shiftOctave(scale[level(p.marketValue / startCash - 1)], -2), velocity: velocityOf(p.marketR) * 0.9 } : null;

    return {
      i,
      date: p.date,
      month: p.month,
      idx,
      pitch: scale[idx],
      velocity: velocityOf(p.r),
      ornament: p.r >= 0.05 ? shiftOctave(scale[idx], 1) : null,
      bass,
      perc,
      value: p.value,
      marketValue: p.marketValue,
      r: p.r,
      liquidated: p.liquidated,
      switched,
    };
  });
  return { major, scale, notes };
}

/** One note of an event-mode phrase (lead melody only: no bass, no percussion). */
export interface PhraseNote {
  i: number;
  idx: number;
  pitch: string;
  velocity: number;
  /** Daily return this note stands for. */
  r: number;
  value: number;
}

export interface Phrase {
  major: boolean;
  scale: string[];
  notes: PhraseNote[];
}

/**
 * Melody for a run of closes after an event: pitch follows the move since `base`
 * (±20% spans the scale), loudness follows the day's own move. Major key if it ended up, minor if down.
 */
export function composePhrase(values: number[], base: number): Phrase {
  const major = (values.at(-1) ?? base) >= base;
  const scale = major ? MAJOR : MINOR;
  const notes = values.map((v, i): PhraseNote => {
    const r = v / (i === 0 ? base : values[i - 1]) - 1;
    const idx = levelIndex((v / base - 1) * 2.5);
    return { i, idx, pitch: scale[idx], velocity: velocityOf(r), r, value: v };
  });
  return { major, scale, notes };
}

export interface Segment {
  start: number;
  /** exclusive */
  end: number;
  month: number;
  label: string;
}

/**
 * 12 秒高光：全年最重要的三段——强平的月份优先，其次是单月盈亏绝对值最大的月份；每段取那个月的前 20 个交易日
 * （0.2 秒一个音 → 约 4 秒），按时间顺序播。label 说明这一段对应哪个决定。
 */
export function highlightSegments(daily: DailyPoint[], history: RoundRecord[], monthLabel: (m: number) => string, n = 3, len = 20): Segment[] {
  const firstDay = new Map<number, number>();
  daily.forEach((p, i) => {
    if (!firstDay.has(p.month)) firstDay.set(p.month, i);
  });
  const score = (h: RoundRecord) => (h.liquidated ? 10 : 0) + Math.abs(h.pnl);
  const top = [...history].sort((a, b) => score(b) - score(a)).slice(0, n).sort((a, b) => a.month - b.month);
  return top.map((h) => {
    const start = firstDay.get(h.month) ?? 0;
    const prev = h.month > 0 ? history[h.month - 1].alloc : null;
    const risky = 100 - h.alloc.cash;
    const before = prev ? 100 - prev.cash : 0;
    const move = h.liquidated
      ? "融资被强平（三声低鼓）"
      : risky > before
        ? `你把风险仓位加到 ${risky}%`
        : risky < before
          ? `你把风险仓位降到 ${risky}%`
          : `你的风险仓位保持 ${risky}%`;
    const sign = h.pnl >= 0 ? "+" : "−";
    return { start, end: Math.min(daily.length, start + len), month: h.month, label: `${monthLabel(h.month)} · ${move} · 当月 ${sign}${Math.abs(h.pnl * 100).toFixed(1)}%` };
  });
}
