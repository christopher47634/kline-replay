"use client";

import { m as motion, useInView } from "motion/react";
import { useRef } from "react";
import { useMotionPref } from "@/components/shell/MotionPref";

/** An SVG polyline/path that draws itself (pathLength 0 → 1). Reduced motion: drawn instantly. `inView` waits for scroll. */
export function DrawPath({
  d,
  stroke = "#FF4D4F",
  strokeWidth = 2,
  duration = 0.8,
  delay = 0,
  inView = false,
  className,
  glow,
}: {
  d: string;
  stroke?: string;
  strokeWidth?: number;
  duration?: number;
  delay?: number;
  inView?: boolean;
  className?: string;
  glow?: boolean;
}) {
  const { reduce } = useMotionPref();
  const ref = useRef<SVGPathElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  const go = !inView || seen;
  return (
    <motion.path
      ref={ref}
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={glow ? { filter: `drop-shadow(0 0 6px ${stroke})` } : undefined}
      initial={{ pathLength: reduce ? 1 : 0 }}
      animate={{ pathLength: go || reduce ? 1 : 0 }}
      transition={{ duration: reduce ? 0 : duration, delay, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
