"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { haptic, play } from "@/lib/sfx";

/** Everything a liquidation does before its dialog: whole-page shake, red vignette, a two-frame RGB split, bust sound, long buzz. */
export function runBustFx(target: HTMLElement | null) {
  play("bust");
  haptic("bust");
  if (!target || document.documentElement.dataset.reduceMotion === "1") return;
  // shake: x ±6px, decaying over 400ms
  target.animate(
    [0, -6, 6, -5, 4, -2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
    { duration: 400, easing: "ease-out" },
  );
  // signal interference: 2 frames (~80ms) of red/cyan channel offset with a sliced band
  target.animate(
    [
      { filter: "none", clipPath: "inset(0 0 0 0)" },
      { filter: "drop-shadow(4px 0 0 rgb(255 0 60 / 0.75)) drop-shadow(-4px 0 0 rgb(0 255 255 / 0.6))", clipPath: "inset(0 0 46% 0)" },
      { filter: "drop-shadow(-4px 0 0 rgb(255 0 60 / 0.75)) drop-shadow(4px 0 0 rgb(0 255 255 / 0.6))", clipPath: "inset(38% 0 0 0)" },
      { filter: "none", clipPath: "inset(0 0 0 0)" },
    ],
    { duration: 80, delay: 60, easing: "steps(1, end)" },
  );
}

/** Red vignette that floods in from the edges over 0.5s and then drains away. Re-triggers when `run` changes. */
export function BustVignette({ run }: { run: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!run) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 700);
    return () => clearTimeout(t);
  }, [run]);
  return (
    <AnimatePresence>
      {on && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none fixed inset-0 z-[65]"
          style={{ background: "radial-gradient(120% 90% at 50% 50%, transparent 40%, rgb(255 40 50 / 0.55) 100%)" }}
        />
      )}
    </AnimatePresence>
  );
}
