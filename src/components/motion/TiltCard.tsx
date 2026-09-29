"use client";

import { m as motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useRef } from "react";
import { useMotionPref } from "@/components/shell/MotionPref";

/**
 * 3D tilt (≤ 6°) following the pointer, plus a soft specular highlight (radial gradient, opacity .08).
 * Touch and reduced motion: a plain wrapper.
 */
export function TiltCard({ children, className, max = 6, glare = true }: { children: React.ReactNode; className?: string; max?: number; glare?: boolean }) {
  const { reduce, touch } = useMotionPref();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 260, damping: 24 });
  const ry = useSpring(useMotionValue(0), { stiffness: 260, damping: 24 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const gOp = useSpring(useMotionValue(0), { stiffness: 200, damping: 30 });
  const bg = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.9), transparent 55%)`;
  const off = reduce || touch;

  const move = (e: React.PointerEvent) => {
    if (off || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 2 * max);
    rx.set(-(py - 0.5) * 2 * max);
    gx.set(px * 100);
    gy.set(py * 100);
    gOp.set(0.08);
  };
  const leave = () => {
    rx.set(0);
    ry.set(0);
    gOp.set(0);
  };

  if (off) return <div className={className}>{children}</div>;
  return (
    <div style={{ perspective: 900 }} className="h-full">
      <motion.div ref={ref} onPointerMove={move} onPointerLeave={leave} style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }} className={`relative h-full ${className ?? ""}`}>
        {children}
        {glare && <motion.span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: bg, opacity: gOp }} />}
      </motion.div>
    </div>
  );
}
