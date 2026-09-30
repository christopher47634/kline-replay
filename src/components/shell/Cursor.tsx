"use client";

import { useEffect, useRef } from "react";
import { useFrameLoop } from "@/lib/frameLoop";
import { useMotionPref } from "./MotionPref";

const HOVERABLE = "a, button, [role='button'], input, textarea, label, summary, [data-cursor]";

/** Desktop-only cursor: a 12px dot that follows exactly and a 32px ring that trails it (lerp), growing to 48px and gold over clickable things. */
export function Cursor() {
  const { reduce, touch, ready } = useMotionPref();
  const on = ready && !reduce && !touch;
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -100, y: -100, rx: -100, ry: -100, hover: false, down: false });

  useEffect(() => {
    if (!on) return;
    document.documentElement.classList.add("has-cursor");
    const move = (e: PointerEvent) => {
      const p = pos.current;
      p.x = e.clientX;
      p.y = e.clientY;
      p.hover = !!(e.target as Element | null)?.closest?.(HOVERABLE);
    };
    const down = () => (pos.current.down = true);
    const up = () => (pos.current.down = false);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, [on]);

  useFrameLoop(() => {
    const p = pos.current;
    p.rx += (p.x - p.rx) * 0.18;
    p.ry += (p.y - p.ry) * 0.18;
    if (dot.current) dot.current.style.transform = `translate3d(${p.x - 6}px, ${p.y - 6}px, 0) scale(${p.down ? 0.7 : 1})`;
    if (ring.current) {
      const s = p.hover ? 1.5 : 1;
      ring.current.style.transform = `translate3d(${p.rx - 16}px, ${p.ry - 16}px, 0) scale(${s})`;
      ring.current.classList.toggle("is-hover", p.hover);
    }
  }, on);

  if (!on) return null;
  return (
    <>
      <div ref={ring} aria-hidden className="cur-ring pointer-events-none fixed left-0 top-0 z-[100] h-8 w-8 rounded-full border transition-[border-color] duration-150" />
      <div ref={dot} aria-hidden className="cur-dot pointer-events-none fixed left-0 top-0 z-[100] h-3 w-3 rounded-full" />
    </>
  );
}
