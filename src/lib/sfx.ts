"use client";

import { getMuted } from "./mute";

export type SfxName = "tick" | "flip" | "up" | "down" | "bust" | "ding";
const NAMES: SfxName[] = ["tick", "flip", "up", "down", "bust", "ding"];
const DEBOUNCE_MS = 80;

let ctx: AudioContext | null = null;
let loading: Promise<void> | null = null;
const buffers = new Map<SfxName, AudioBuffer>();
const lastAt = new Map<SfxName, number>();

declare global {
  interface Window {
    /** Test hook: what played last, and a small log. */
    __sfx?: { lastPlayed: SfxName | null; log: SfxName[] };
  }
}

function hook() {
  if (typeof window === "undefined") return null;
  return (window.__sfx ??= { lastPlayed: null, log: [] });
}

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

/** Fetch and decode the six clips (~12 KB together). Called on the first user gesture, never before. */
export function preloadSfx(): Promise<void> {
  loading ??= (async () => {
    const c = audio();
    if (!c) return;
    await Promise.all(
      NAMES.map(async (n) => {
        try {
          const res = await fetch(`/sfx/${n}.mp3`);
          buffers.set(n, await c.decodeAudioData(await res.arrayBuffer()));
        } catch {
          /* a missing clip only means silence for that one */
        }
      }),
    );
  })();
  return loading;
}

/** Resume the audio context inside a user gesture (browsers block it otherwise) and load the clips. */
export async function unlockAudio(): Promise<boolean> {
  const c = audio();
  if (!c) return false;
  try {
    await c.resume();
  } catch {
    /* ignore */
  }
  void preloadSfx();
  return c.state === "running";
}

export function play(name: SfxName, gain = 0.8) {
  const h = hook();
  if (getMuted()) return;
  const now = performance.now();
  if (now - (lastAt.get(name) ?? -1e9) < DEBOUNCE_MS) return;
  lastAt.set(name, now);
  if (h) {
    h.lastPlayed = name;
    h.log.push(name);
    if (h.log.length > 50) h.log.shift();
  }
  const c = audio();
  const buf = buffers.get(name);
  if (!c || !buf) {
    void preloadSfx();
    return;
  }
  if (c.state === "suspended") void c.resume().catch(() => undefined);
  const src = c.createBufferSource();
  const g = c.createGain();
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(g).connect(c.destination);
  src.start();
}

const PATTERNS = { tick: 10, settle: [20, 40, 20], bust: [60, 40, 60, 40, 120], correct: [15, 30, 15], wrong: 40, stamp: 20 } as const;

/** Android vibration; iOS has no API, so this is a no-op there. Skipped under reduced motion. */
export function haptic(kind: keyof typeof PATTERNS) {
  if (typeof navigator === "undefined" || document.documentElement.dataset.reduceMotion === "1") return;
  try {
    navigator.vibrate?.(PATTERNS[kind] as number | number[]);
  } catch {
    /* unsupported */
  }
}

/** Soft click for buttons and slider steps (kept as `tick()` for existing call sites). */
export function tick() {
  play("tick");
  haptic("tick");
}
