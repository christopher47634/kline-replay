// Renders the six UI sound effects to public/sfx/*.mp3 (needs ffmpeg on PATH).
// Usage: node scripts/render_sfx.mjs
// Pure-JS synthesis (no Web Audio needed), deterministic: same output on every run.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SR = 44100;
const TAU = Math.PI * 2;
const out = "public/sfx";
mkdirSync(out, { recursive: true });

let seed = 1234567;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const buf = (sec) => new Float32Array(Math.round(sec * SR));
const env = (i, n, a, decayTo = 0.001) => {
  const t = i / n;
  const atk = Math.min(1, i / (a * SR));
  return atk * Math.pow(decayTo, t);
};
const tone = (b, at, dur, f, { type = "sine", gain = 1, decay = 0.001, atk = 0.004, f2 = null } = {}) => {
  const n = Math.round(dur * SR);
  const s = Math.round(at * SR);
  let ph = 0;
  for (let i = 0; i < n && s + i < b.length; i++) {
    const fr = f2 === null ? f : f + (f2 - f) * (i / n);
    ph += (TAU * fr) / SR;
    let v = Math.sin(ph);
    if (type === "tri") v = (2 / Math.PI) * Math.asin(Math.sin(ph));
    b[s + i] += v * gain * env(i, n, atk, decay);
  }
};
const bandNoise = (b, at, dur, lo, hi, gain, decay = 0.02) => {
  // one-pole high-pass + low-pass is enough for "paper"
  const n = Math.round(dur * SR);
  const s = Math.round(at * SR);
  let lp = 0;
  let hp = 0;
  const a1 = Math.exp(-TAU * hi / SR);
  const a2 = Math.exp(-TAU * lo / SR);
  for (let i = 0; i < n && s + i < b.length; i++) {
    const x = rnd();
    lp = (1 - a1) * x + a1 * lp;
    hp = (1 - a2) * lp + a2 * hp;
    b[s + i] += (lp - hp) * gain * env(i, n, 0.006, decay);
  }
};
const shape = (b, drive) => {
  for (let i = 0; i < b.length; i++) b[i] = Math.tanh(b[i] * drive) / Math.tanh(drive);
};

const sounds = {
  tick: () => {
    const b = buf(0.04);
    tone(b, 0, 0.04, 1200, { gain: 0.9, decay: 0.002, atk: 0.001 });
    tone(b, 0, 0.012, 2400, { gain: 0.3, decay: 0.01, atk: 0.0005 });
    return b;
  },
  flip: () => {
    const b = buf(0.18);
    bandNoise(b, 0, 0.18, 900, 5200, 5, 0.03);
    return b;
  },
  up: () => {
    const b = buf(0.32);
    [[523.25, 0], [659.25, 0.08], [783.99, 0.16]].forEach(([f, t]) => tone(b, t, 0.16, f, { type: "tri", gain: 0.55, decay: 0.03 }));
    return b;
  },
  down: () => {
    const b = buf(0.3);
    [[659.25, 0], [523.25, 0.11]].forEach(([f, t]) => tone(b, t, 0.19, f, { type: "tri", gain: 0.6, decay: 0.03 }));
    shape(b, 2.2);
    return b;
  },
  bust: () => {
    const b = buf(0.6);
    tone(b, 0, 0.32, 140, { gain: 1, decay: 0.01, f2: 38, atk: 0.002 });
    tone(b, 0.05, 0.5, 220, { type: "tri", gain: 0.35, decay: 0.01, f2: 55 });
    bandNoise(b, 0, 0.12, 300, 4000, 3, 0.02);
    shape(b, 1.8);
    return b;
  },
  ding: () => {
    const b = buf(0.4);
    tone(b, 0, 0.4, 783.99, { gain: 0.6, decay: 0.004 });
    tone(b, 0, 0.3, 1567.98, { gain: 0.25, decay: 0.004 });
    tone(b, 0, 0.2, 2349.32, { gain: 0.1, decay: 0.004 });
    return b;
  },
};

const tmp = mkdtempSync(join(tmpdir(), "kline-sfx-"));
for (const [name, make] of Object.entries(sounds)) {
  const f = make();
  let peak = 0;
  for (const v of f) peak = Math.max(peak, Math.abs(v));
  const g = peak ? 0.7 / peak : 1; // ~ -3 dBFS peak; loudness is then matched by ear across the set
  const pcm = Buffer.alloc(44 + f.length * 2);
  pcm.write("RIFF", 0);
  pcm.writeUInt32LE(36 + f.length * 2, 4);
  pcm.write("WAVEfmt ", 8);
  pcm.writeUInt32LE(16, 16);
  pcm.writeUInt16LE(1, 20);
  pcm.writeUInt16LE(1, 22);
  pcm.writeUInt32LE(SR, 24);
  pcm.writeUInt32LE(SR * 2, 28);
  pcm.writeUInt16LE(2, 32);
  pcm.writeUInt16LE(16, 34);
  pcm.write("data", 36);
  pcm.writeUInt32LE(f.length * 2, 40);
  f.forEach((v, i) => pcm.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * g * 32767))), 44 + i * 2));
  const wav = join(tmp, `${name}.wav`);
  writeFileSync(wav, pcm);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-b:a", "40k", join(out, `${name}.mp3`)]);
  console.log(name, `${(f.length / SR * 1000).toFixed(0)} ms`);
}
rmSync(tmp, { recursive: true, force: true });
