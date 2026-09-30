"use client";

import { useEffect } from "react";
import { useMotionPref } from "./MotionPref";

/*
 * Pointer-driven effects shared by every page (desktop, fine pointer, full motion only):
 *  - Magic Card spotlight: the panel under the pointer (.card-surface / .spot) gets --sx/--sy and .spot-on,
 *    and motion.css paints a soft glow plus a lit stretch of border around that point.
 *  - Dot Pattern: the fixed dot field lights up the dots around the pointer (--dx/--dy on .dotfield only,
 *    so the rest of the document never restyles).
 * One listener, one rAF per frame at most.
 */
export function Interact() {
  const { reduce, touch, ready } = useMotionPref();
  const on = ready && !reduce && !touch;

  useEffect(() => {
    if (!on) return;
    const field = document.querySelector<HTMLElement>(".dotfield");
    let hot: HTMLElement | null = null;
    let x = 0;
    let y = 0;
    let target: Element | null = null;
    let raf = 0;
    const frame = () => {
      raf = 0;
      const card = target?.closest?.<HTMLElement>(".card-surface, .spot") ?? null;
      if (card !== hot) {
        hot?.classList.remove("spot-on");
        hot = card;
        card?.classList.add("spot-on");
      }
      if (card) {
        const b = card.getBoundingClientRect();
        card.style.setProperty("--sx", `${(x - b.left).toFixed(0)}px`);
        card.style.setProperty("--sy", `${(y - b.top).toFixed(0)}px`);
      }
      if (field) {
        field.style.setProperty("--dx", `${x}px`);
        field.style.setProperty("--dy", `${y}px`);
      }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      target = e.target as Element | null;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const leave = () => {
      hot?.classList.remove("spot-on");
      hot = null;
      field?.style.setProperty("--dx", "-500px");
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
      leave();
    };
  }, [on]);

  return <div aria-hidden className="dotfield" />;
}
