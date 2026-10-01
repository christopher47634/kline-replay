import type { MonthNote, ReasonId } from "./types";

/*
 * 理由与判断（可选，不影响结算）。结果链接里另带一个 n= 参数，让年终回放能讲「你当时为什么这么做」；
 * 这个参数坏了或被删掉，结果照样能算，只是回放里显示「没留理由」。
 * 每月 2 个字符：rumor(0-2) + 3 × (moment+1, 0-4) + 15 × (reason+1, 0-7) + 120 × edited(0/1) < 240 ≤ 64²。
 */

export const REASONS: { id: ReasonId; label: string }[] = [
  { id: "news", label: "头条和政策" },
  { id: "rumor", label: "小道消息" },
  { id: "chart", label: "走势和涨跌" },
  { id: "macro", label: "宏观数据" },
  { id: "fomo", label: "怕错过行情" },
  { id: "fear", label: "怕继续亏" },
  { id: "gut", label: "凭感觉" },
];
export const reasonLabel = (id: ReasonId | undefined) => REASONS.find((r) => r.id === id)?.label ?? null;

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const MONTHS = 12;

function pack(n: MonthNote | undefined): number {
  if (!n) return 0;
  const rumor = n.rumor === "trust" ? 1 : n.rumor === "doubt" ? 2 : 0;
  const moment = n.moment === undefined ? 0 : Math.min(3, Math.max(0, n.moment)) + 1;
  const ri = REASONS.findIndex((r) => r.id === n.reason);
  return rumor + 3 * moment + 15 * (ri + 1) + 120 * (n.edited ? 1 : 0);
}

function unpack(v: number): MonthNote | null {
  if (!Number.isInteger(v) || v <= 0 || v >= 240) return null;
  const note: MonthNote = {};
  const rumor = v % 3;
  const moment = Math.floor(v / 3) % 5;
  const reason = Math.floor(v / 15) % 8;
  if (rumor) note.rumor = rumor === 1 ? "trust" : "doubt";
  if (moment) note.moment = moment - 1;
  if (reason) {
    const r = REASONS[reason - 1];
    if (!r) return null;
    note.reason = r.id;
  }
  if (v >= 120) note.edited = true;
  return note;
}

/** "" when there is nothing to say (the n= parameter is then left out). */
export function encodeNotes(notes: Record<number, MonthNote>): string {
  const vals = Array.from({ length: MONTHS }, (_, m) => pack(notes[m]));
  if (vals.every((v) => v === 0)) return "";
  return vals.map((v) => ALPHABET[v >> 6] + ALPHABET[v & 63]).join("");
}

/** Lenient: anything malformed decodes to "no notes" for that month (or for all). */
export function decodeNotes(s: string | null | undefined): Record<number, MonthNote> {
  const out: Record<number, MonthNote> = {};
  if (!s || s.length !== MONTHS * 2) return out;
  for (let m = 0; m < MONTHS; m++) {
    const hi = ALPHABET.indexOf(s[m * 2]);
    const lo = ALPHABET.indexOf(s[m * 2 + 1]);
    if (hi < 0 || lo < 0) return {};
    const n = unpack(hi * 64 + lo);
    if (n) out[m] = n;
  }
  return out;
}
