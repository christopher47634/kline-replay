import { checksum, fromBase64url, toBase64url } from "@/game/encode";
import { CARDS_PER_GAME, type Guess } from "./types";

/**
 * 22 bytes -> 30 base64url chars.
 *   byte 0        deck number
 *   bytes 1..10   event index (position in the deck's full events array)
 *   bytes 11..20  answer: bit0 = up, bits1..3 = magnitude bucket 0..4 (7 = not guessed)
 *   byte 21       checksum (mixed with the deck id)
 */
const LEN = 1 + CARDS_PER_GAME * 2 + 1;
const NO_BUCKET = 7;

export interface EventGameCode {
  deckNo: number;
  events: number[];
  guesses: Guess[];
}

export function encodeEvents(deckId: string, g: EventGameCode): string {
  if (g.events.length !== CARDS_PER_GAME || g.guesses.length !== CARDS_PER_GAME) throw new Error("need exactly 10 cards");
  const bytes = new Uint8Array(LEN);
  bytes[0] = g.deckNo;
  g.events.forEach((e, i) => {
    if (!Number.isInteger(e) || e < 0 || e > 255) throw new Error("event index out of range");
    bytes[1 + i] = e;
  });
  g.guesses.forEach((a, i) => {
    if (a.bucket !== null && (a.bucket < 0 || a.bucket > 4)) throw new Error("bucket out of range");
    bytes[1 + CARDS_PER_GAME + i] = (a.up ? 1 : 0) | ((a.bucket ?? NO_BUCKET) << 1);
  });
  bytes[LEN - 1] = checksum(bytes.subarray(0, LEN - 1), deckId);
  return toBase64url(bytes);
}

export type EventDecodeResult = ({ ok: true } & EventGameCode) | { ok: false; error: string };

export function decodeEvents(deckId: string, code: string | null | undefined): EventDecodeResult {
  if (!code) return { ok: false, error: "缺少结果参数" };
  const bytes = fromBase64url(code);
  if (!bytes || bytes.length !== LEN) return { ok: false, error: "长度不对" };
  if (checksum(bytes.subarray(0, LEN - 1), deckId) !== bytes[LEN - 1]) return { ok: false, error: "校验失败" };
  const events = Array.from(bytes.subarray(1, 1 + CARDS_PER_GAME));
  if (new Set(events).size !== events.length) return { ok: false, error: "题目重复" };
  const guesses: Guess[] = [];
  let withBucket = 0;
  for (let i = 0; i < CARDS_PER_GAME; i++) {
    const b = bytes[1 + CARDS_PER_GAME + i];
    if (b & 0xf0) return { ok: false, error: "答案格式不对" };
    const bucket = (b >> 1) & 7;
    if (bucket > 4 && bucket !== NO_BUCKET) return { ok: false, error: "答案格式不对" };
    if (bucket !== NO_BUCKET) withBucket++;
    guesses.push({ up: (b & 1) === 1, bucket: bucket === NO_BUCKET ? null : bucket });
  }
  // The magnitude round is all-or-nothing for a game.
  if (withBucket !== 0 && withBucket !== CARDS_PER_GAME) return { ok: false, error: "答案格式不对" };
  return { ok: true, deckNo: bytes[0], events, guesses };
}
