"use client";

import { useEffect } from "react";
import { useMotionPref } from "./MotionPref";

/**
 * Smooth scrolling (Lenis) driven by GSAP's ticker so ScrollTrigger stays in step. Loaded on demand and only
 * where it applies: off on phones (native scroll is smoother) and under reduced motion. Each ScrollTrigger owner cleans up after itself.
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const { reduce, small, ready } = useMotionPref();
  const enabled = ready && !reduce && !small;

  useEffect(() => {
    if (!enabled) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    Promise.all([import("lenis"), import("gsap"), import("gsap/ScrollTrigger")]).then(([L, g, s]) => {
      if (cancelled) return;
      const gsap = g.default;
      gsap.registerPlugin(s.ScrollTrigger);
      const lenis = new L.default({ lerp: 0.1, smoothWheel: true, autoRaf: false });
      const raf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      lenis.on("scroll", s.ScrollTrigger.update);
      stop = () => {
        gsap.ticker.remove(raf);
        lenis.destroy();
      };
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [enabled]);

  return <>{children}</>;
}
