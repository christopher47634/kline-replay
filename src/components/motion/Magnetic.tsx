"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import { useMotionPref } from "@/components/shell/MotionPref";
import { tick } from "@/lib/sfx";

const RANGE = 80;
const MAX = 6;
const SPRING = { stiffness: 320, damping: 28 };

/** Pointer within 80px pulls the element up to 6px toward the pointer (spring 320/28); pressing scales to 0.96. Off on touch and reduced motion. */
function useMagnet() {
  const { reduce, touch } = useMotionPref();
  const ref = useRef<HTMLElement>(null);
  const x = useSpring(useMotionValue(0), SPRING);
  const y = useSpring(useMotionValue(0), SPRING);
  const off = reduce || touch;
  const onMove = (e: React.PointerEvent) => {
    if (off || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    const k = dist > RANGE ? 0 : 1;
    x.set(k * Math.max(-MAX, Math.min(MAX, dx * 0.15)));
    y.set(k * Math.max(-MAX, Math.min(MAX, dy * 0.25)));
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };
  return { ref, x, y, onMove, onLeave, off };
}

type Common = { className?: string; children: React.ReactNode; sound?: boolean };

type ButtonExtras = {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-expanded"?: boolean;
  id?: string;
  [data: `data-${string}`]: string | undefined;
};

export function MagneticButton({ className, children, sound = true, onClick, disabled, ...rest }: Common & ButtonExtras) {
  const m = useMagnet();
  return (
    <motion.button
      {...rest}
      ref={m.ref as React.Ref<HTMLButtonElement>}
      type="button"
      disabled={disabled}
      style={{ x: m.x, y: m.y }}
      whileTap={disabled || m.off ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.08 }}
      onPointerMove={m.onMove}
      onPointerLeave={m.onLeave}
      onClick={(e) => {
        if (sound && !disabled) tick();
        onClick?.(e);
      }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

const MotionLink = motion.create(Link);

export function MagneticLink({ className, children, href, sound = true, onClick }: Common & { href: string; onClick?: React.MouseEventHandler<HTMLAnchorElement> }) {
  const m = useMagnet();
  return (
    <MotionLink
      href={href}
      ref={m.ref as React.Ref<HTMLAnchorElement>}
      style={{ x: m.x, y: m.y }}
      whileTap={m.off ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.08 }}
      onPointerMove={m.onMove}
      onPointerLeave={m.onLeave}
      onClick={(e) => {
        if (sound) tick();
        onClick?.(e);
      }}
      className={className}
    >
      {children}
    </MotionLink>
  );
}
