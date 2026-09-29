"use client";

import { m as motion } from "motion/react";
import { useMotionPref } from "@/components/shell/MotionPref";

/**
 * Entrance: y 24 → 0 and fade, 320ms ease-out, optional `delay` for staggers (40–80ms steps).
 * Phones trigger when scrolled into view instead of on mount; reduced motion shows the content immediately.
 */
export function Enter({ children, delay = 0, y = 24, className }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const { reduce, small } = useMotionPref();
  const to = { opacity: 1, y: 0 };
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      {...(small ? { whileInView: to, viewport: { once: true, margin: "0px 0px -8% 0px" } } : { animate: to })}
      transition={{ duration: 0.32, delay: reduce || small ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
