"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface MotionPref {
  /** prefers-reduced-motion, or battery saver: no particles, no scroll binding, no odometer, fade-only transitions. */
  reduce: boolean;
  /** Coarse pointer: no custom cursor, no magnetic buttons, no 3D tilt. */
  touch: boolean;
  /** Viewport < 768px: no Lenis, no pinned storytelling, fewer particles. */
  small: boolean;
  /** False until the first client measurement, so SSR and hydration render the same thing. */
  ready: boolean;
}

const SSR: MotionPref = { reduce: false, touch: false, small: false, ready: false };
const Ctx = createContext<MotionPref>(SSR);

export function useMotionPref() {
  return useContext(Ctx);
}

/** Reads media queries once and keeps them live. Everything animated in the app asks this instead of matchMedia. */
export function ReducedMotionProvider({ children }: { children: React.ReactNode }) {
  const [pref, setPref] = useState<MotionPref>(SSR);

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const small = window.matchMedia("(max-width: 767px)");
    let lowBattery = false;
    const compute = () => setPref({ reduce: rm.matches || lowBattery, touch: coarse.matches, small: small.matches, ready: true });
    compute();
    [rm, coarse, small].forEach((m) => m.addEventListener("change", compute));

    // Battery saver below 20% counts as reduced motion (API is Chromium-only; absent elsewhere).
    type Battery = { level: number; charging: boolean; addEventListener: (e: string, f: () => void) => void; removeEventListener: (e: string, f: () => void) => void };
    let bat: Battery | null = null;
    const onBat = () => {
      lowBattery = !!bat && bat.level < 0.2 && !bat.charging;
      compute();
    };
    (navigator as unknown as { getBattery?: () => Promise<Battery> }).getBattery?.().then((b) => {
      bat = b;
      b.addEventListener("levelchange", onBat);
      b.addEventListener("chargingchange", onBat);
      onBat();
    }).catch(() => undefined);

    return () => {
      [rm, coarse, small].forEach((m) => m.removeEventListener("change", compute));
      bat?.removeEventListener("levelchange", onBat);
      bat?.removeEventListener("chargingchange", onBat);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = pref.reduce ? "1" : "0";
  }, [pref.reduce]);

  return <Ctx.Provider value={pref}>{children}</Ctx.Provider>;
}
