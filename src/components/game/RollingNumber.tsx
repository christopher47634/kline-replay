"use client";

import { useEffect, useRef, useState } from "react";

/** Animates from the previous value to the new one over `ms` (300 ms per spec). */
export function RollingNumber({ value, format, ms = 300, className = "" }: { value: number; format: (v: number) => string; ms?: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const eased = 1 - (1 - k) ** 3;
      setShown(start + (value - start) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    // Hidden tabs throttle rAF; guarantee the final value lands.
    const done = setTimeout(() => {
      setShown(value);
      from.current = value;
    }, ms + 50);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
  }, [value, ms]);
  return <span className={`num ${className}`}>{format(shown)}</span>;
}
