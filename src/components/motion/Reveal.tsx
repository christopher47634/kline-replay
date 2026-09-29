"use client";

import { createElement, useEffect, useRef } from "react";
import { useMotionPref } from "@/components/shell/MotionPref";

type Tag = "h1" | "h2" | "h3" | "p" | "span" | "div";

/**
 * Text reveal: each line (or character) slides up out of a mask. Uses GSAP SplitText (accessible: it keeps
 * aria-label on the element and reverts on unmount). GSAP is imported on demand so it stays out of the first-load bundle.
 * Reduced motion or before the client measures: plain text. `inView` waits until the element scrolls into view.
 */
export function Reveal({
  as = "p",
  by = "lines",
  delay = 0,
  stagger,
  inView = false,
  className,
  style,
  children,
}: {
  as?: Tag;
  by?: "lines" | "chars";
  delay?: number;
  stagger?: number;
  inView?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const { reduce, ready } = useMotionPref();

  useEffect(() => {
    const el = ref.current;
    if (!el || !ready) return;
    if (reduce) {
      el.style.visibility = "visible";
      return;
    }
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    Promise.all([import("gsap"), import("gsap/SplitText"), import("gsap/ScrollTrigger"), document.fonts.ready]).then(([g, st, sc]) => {
      if (cancelled) return;
      const gsap = g.default;
      gsap.registerPlugin(st.SplitText, sc.ScrollTrigger);
      const split = st.SplitText.create(el, { type: by === "chars" ? "lines,chars" : "lines", mask: "lines", linesClass: "reveal-line" });
      el.style.visibility = "visible";
      const targets = by === "chars" ? split.chars : split.lines;
      gsap.set(targets, { yPercent: 110 });
      let tween: gsap.core.Tween | null = null;
      let trigger: ScrollTrigger | null = null;
      const run = () => {
        tween = gsap.to(targets, { yPercent: 0, duration: 0.64, ease: "expo.out", delay, stagger: stagger ?? (by === "chars" ? 0.06 : 0.08) });
      };
      if (inView) trigger = sc.ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: run });
      else run();
      cleanup = () => {
        tween?.kill();
        trigger?.kill();
        split.revert();
      };
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [reduce, ready, by, delay, stagger, inView, children]);

  return createElement(as, { ref, className, style: { ...style, visibility: ready && reduce ? "visible" : "hidden" } }, children);
}
