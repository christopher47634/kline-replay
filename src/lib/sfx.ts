"use client";

import { getMuted } from "./mute";

let ctx: AudioContext | null = null;

/** A soft click for the "next month" button. Silent if Web Audio is unavailable. */
export function tick() {
  if (getMuted()) return;
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.08);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  } catch {
    /* no audio: the game does not depend on it */
  }
}
