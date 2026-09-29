"use client";

import { useEffect, useRef } from "react";

/**
 * One requestAnimationFrame loop for the whole app. Components register a callback with useFrameLoop();
 * the loop only runs while at least one callback is registered and the tab is visible, and it stops
 * completely when the last one unmounts (e2e asserts `window.__frameLoop.active === 0` after navigating).
 */
type Frame = (time: number, delta: number) => void;

const subs = new Set<Frame>();
let raf = 0;
let last = 0;

function tick(t: number) {
  raf = 0;
  if (document.hidden || subs.size === 0) return;
  const dt = last ? Math.min(64, t - last) : 16;
  last = t;
  subs.forEach((f) => f(t, dt));
  raf = requestAnimationFrame(tick);
}

function start() {
  if (!raf && !document.hidden && subs.size) {
    last = 0;
    raf = requestAnimationFrame(tick);
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else start();
  });
  (window as unknown as { __frameLoop: object }).__frameLoop = {
    get active() {
      return subs.size;
    },
    get running() {
      return raf !== 0;
    },
  };
}

export function useFrameLoop(cb: Frame, active = true) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!active) return;
    const f: Frame = (t, d) => ref.current(t, d);
    subs.add(f);
    start();
    return () => {
      subs.delete(f);
      if (!subs.size) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
  }, [active]);
}
