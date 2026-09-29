"use client";

import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createElement, useEffect, useRef } from "react";
import { useMotionPref } from "@/components/shell/MotionPref";

gsap.registerPlugin(SplitText, ScrollTrigger);

type Tag = "h1" | "h2" | "h3" | "p" | "span" | "div";

/**
 * Text reveal: each line (or character) slides up out of a mask. Uses GSAP SplitText (accessible: it keeps
 * aria-label on the element and reverts on unmount). Reduced motion or before the client measures: plain text.
 * `inView` waits until the element scrolls into view.
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
    let split: SplitText | null = null;
    let tween: gsap.core.Tween | null = null;
    let trigger: ScrollTrigger | null = null;
    let cancelled = false;
    // Wait for the display font: splitting before it loads measures the wrong line breaks.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      split = SplitText.create(el, { type: by === "chars" ? "lines,chars" : "lines", mask: "lines", linesClass: "reveal-line" });
      el.style.visibility = "visible";
      const targets = by === "chars" ? split.chars : split.lines;
      gsap.set(targets, { yPercent: 110 });
      const run = () => {
        tween = gsap.to(targets, { yPercent: 0, duration: 0.64, ease: "expo.out", delay, stagger: stagger ?? (by === "chars" ? 0.06 : 0.08) });
      };
      if (inView) trigger = ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: run });
      else run();
    });
    return () => {
      cancelled = true;
      tween?.kill();
      trigger?.kill();
      split?.revert();
    };
  }, [reduce, ready, by, delay, stagger, inView, children]);

  return createElement(as, { ref, className, style: { ...style, visibility: ready && reduce ? "visible" : "hidden" } }, children);
}
