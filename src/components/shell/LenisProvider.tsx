"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useMotionPref } from "./MotionPref";

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scrolling (Lenis) driven by GSAP's ticker so ScrollTrigger stays in step.
 * Off on phones (native scroll is smoother) and under reduced motion. ScrollTriggers are killed on every route change.
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const { reduce, small, ready } = useMotionPref();
  const lenis = useRef<LenisRef>(null);
  const pathname = usePathname();
  const enabled = ready && !reduce && !small;

  useEffect(() => {
    if (!enabled) return;
    const raf = (time: number) => lenis.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    const l = lenis.current?.lenis;
    const onScroll = () => ScrollTrigger.update();
    l?.on("scroll", onScroll);
    return () => {
      gsap.ticker.remove(raf);
      l?.off("scroll", onScroll);
    };
  }, [enabled]);

  useEffect(() => {
    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, [pathname]);

  if (!enabled) return <>{children}</>;
  return (
    <ReactLenis root ref={lenis} options={{ autoRaf: false, lerp: 0.1, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
