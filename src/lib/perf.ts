"use client";

import { useSyncExternalStore } from "react";

/*
 * Automatic quality steps (流畅度保底). Every effect is on by default; if this device cannot keep up — five frames
 * longer than 100 ms within six seconds, measured with the browser's long-animation-frame / long-task reports, which
 * cost nothing while things are smooth — the heaviest effects step down, for this visit only:
 *   1: pointer spotlight, lit dot lens, glass refraction off (glass keeps blur + highlight)
 *   2: also the looping decorations: border beam, sweeps, per-character headline reveal, list stagger, fewer confetti
 * <html data-perf="1|2">; motion.css holds the rules. The reader can switch everything back in 阅读设置.
 */

export type PerfLevel = 0 | 1 | 2;
const KEY = "kline:perf";
let level: PerfLevel = 0;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const v = Number(sessionStorage.getItem(KEY));
    level = v === 1 || v === 2 ? v : 0;
  } catch {
    level = 0;
  }
}

export function getPerf(): PerfLevel {
  load();
  return level;
}

export function setPerf(v: PerfLevel) {
  load();
  level = v;
  try {
    if (v) sessionStorage.setItem(KEY, String(v));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
  applyPerf();
  subs.forEach((f) => f());
}

export function applyPerf() {
  const el = document.documentElement;
  if (getPerf()) el.dataset.perf = String(getPerf());
  else delete el.dataset.perf;
}

export function usePerf(): PerfLevel {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    getPerf,
    () => 0,
  );
}

/** Starts watching for sustained jank; returns a stop function. */
export function watchJank(): () => void {
  if (typeof PerformanceObserver === "undefined") return () => {};
  const types = PerformanceObserver.supportedEntryTypes ?? [];
  const type = types.includes("long-animation-frame") ? "long-animation-frame" : types.includes("longtask") ? "longtask" : null;
  if (!type) return () => {};
  const born = performance.now();
  let hits: number[] = [];
  const po = new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.startTime - born < 5000 || document.hidden || e.duration < 100) continue; // ignore load and hydration
      hits.push(e.startTime);
    }
    const now = performance.now();
    hits = hits.filter((t) => now - t < 6000);
    const cur = getPerf();
    if (hits.length >= 5 && cur < 2) {
      hits = [];
      setPerf((cur + 1) as PerfLevel);
    }
  });
  po.observe({ type, buffered: false });
  return () => po.disconnect();
}
