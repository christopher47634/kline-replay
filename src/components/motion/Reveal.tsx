"use client";

import { createElement, useEffect, useRef } from "react";
import { useMotionPref } from "@/components/shell/MotionPref";
import { retryImport } from "@/lib/retry";

type Tag = "h1" | "h2" | "h3" | "p" | "span" | "div";

/**
 * Text reveal: each line (or character) slides up out of a mask. Uses GSAP SplitText (accessible: it keeps
 * aria-label on the element and reverts on unmount). GSAP is imported on demand so it stays out of the first-load bundle.
 * Reduced motion or before the client measures: plain text. `inView` waits until the element scrolls into view.
 *
 * The text starts hidden (so it does not flash before it slides in). It must never stay hidden: the .reveal-pending
 * class shows it after 1.4 s by CSS alone (no JS, slow network, failed chunk), the library and fonts are given a short
 * window, and if they arrive after the text is already shown, it is simply left as is.
 */
const LATE_MS = 1300;
const FONT_WAIT_MS = 700;
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
    const born = performance.now();
    const show = () => {
      el.style.visibility = "visible";
      el.classList.remove("reveal-pending");
    };
    // fonts only matter for line breaks; never wait on them for long (a 240 KB serif on a slow line)
    const fonts = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, FONT_WAIT_MS))]);
    Promise.all([retryImport(() => import("gsap")), retryImport(() => import("gsap/SplitText")), retryImport(() => import("gsap/ScrollTrigger")), fonts]).then(([g, st, sc]) => {
      if (cancelled) return;
      // too late for an entrance: the CSS fallback already showed the text, do not hide it again to animate it
      if (!inView && performance.now() - born > LATE_MS) return show();
      const gsap = g.default;
      gsap.registerPlugin(st.SplitText, sc.ScrollTrigger);
      const split = st.SplitText.create(el, { type: by === "chars" ? "lines,chars" : "lines", mask: "lines", linesClass: "reveal-line" });
      show();
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
    }, show);
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [reduce, ready, by, delay, stagger, inView, children]);

  const shown = ready && reduce;
  return createElement(as, { ref, className: `${className ?? ""}${shown ? "" : " reveal-pending"}`, style: { ...style, visibility: shown ? "visible" : "hidden" } }, children);
}
