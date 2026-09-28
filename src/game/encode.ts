import { ASSET_IDS, type Allocation } from "./types";
import { allocSum } from "./engine";

/**
 * 12 allocations x 6 values, each 0-100 in steps of 5 -> 0..20 in 5 bits.
 * 360 bits = 45 bytes, +1 checksum byte = 46 bytes -> 62 base64url chars.
 * Format: `{scriptId}.{payload}`.
 */
const MONTHS = 12;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function checksum(bytes: Uint8Array, scriptId: string): number {
  let c = 0x5a;
  for (const ch of scriptId) c = (c * 31 + ch.charCodeAt(0)) & 0xff;
  for (let i = 0; i < bytes.length; i++) c = ((c * 33) ^ bytes[i]) & 0xff;
  return c;
}

function toBase64url(bytes: Uint8Array): string {
  let out = "";
  let buf = 0;
  let bits = 0;
  for (const b of bytes) {
    buf = (buf << 8) | b;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      out += ALPHABET[(buf >> bits) & 63];
    }
    buf &= (1 << bits) - 1;
  }
  if (bits > 0) out += ALPHABET[(buf << (6 - bits)) & 63];
  return out;
}

function fromBase64url(s: string): Uint8Array | null {
  const bytes: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of s) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return null;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buf >> bits) & 0xff);
    }
    buf &= (1 << bits) - 1;
  }
  // Leftover padding bits must be zero, otherwise two strings could decode identically.
  if (buf !== 0) return null;
  return Uint8Array.from(bytes);
}

export function encodeGame(scriptId: string, allocs: Allocation[]): string {
  if (allocs.length > MONTHS) throw new Error("too many months");
  const filled = [...allocs];
  // A wiped-out game stops early; pad with all-cash months, replay stops at zero anyway.
  while (filled.length < MONTHS) filled.push({ sh50: 0, cyb: 0, bank: 0, baijiu: 0, cash: 100, margin: 0 });
  const bytes = new Uint8Array(46);
  let bitPos = 0;
  for (const a of filled) {
    for (const id of ASSET_IDS) {
      const v = a[id];
      if (v % 5 !== 0 || v < 0 || v > 100) throw new Error(`value must be 0-100 step 5: ${id}=${v}`);
      const q = v / 5;
      for (let b = 4; b >= 0; b--) {
        if ((q >> b) & 1) bytes[bitPos >> 3] |= 0x80 >> (bitPos & 7);
        bitPos++;
      }
    }
  }
  bytes[45] = checksum(bytes.subarray(0, 45), scriptId);
  return `${scriptId}.${toBase64url(bytes)}`;
}

export type DecodeResult = { ok: true; scriptId: string; allocs: Allocation[] } | { ok: false; error: string };

export function decodeGame(code: string | null | undefined): DecodeResult {
  if (!code) return { ok: false, error: "缺少结果参数" };
  const dot = code.indexOf(".");
  if (dot <= 0) return { ok: false, error: "格式不对" };
  const scriptId = code.slice(0, dot);
  const bytes = fromBase64url(code.slice(dot + 1));
  if (!bytes || bytes.length !== 46) return { ok: false, error: "长度不对" };
  if (checksum(bytes.subarray(0, 45), scriptId) !== bytes[45]) return { ok: false, error: "校验失败" };
  const allocs: Allocation[] = [];
  let bitPos = 0;
  for (let m = 0; m < MONTHS; m++) {
    const a = {} as Allocation;
    for (const id of ASSET_IDS) {
      let q = 0;
      for (let b = 0; b < 5; b++) {
        q = (q << 1) | ((bytes[bitPos >> 3] >> (7 - (bitPos & 7))) & 1);
        bitPos++;
      }
      if (q > 20) return { ok: false, error: "数值越界" };
      a[id] = q * 5;
    }
    if (allocSum(a) !== 100) return { ok: false, error: "仓位合计不为 100%" };
    allocs.push(a);
  }
  return { ok: true, scriptId, allocs };
}
