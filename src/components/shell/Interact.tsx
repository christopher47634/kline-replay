"use client";

import { useEffect } from "react";
import { useMotionPref } from "./MotionPref";

/*
 * Pointer-driven effects shared by every page (desktop, fine pointer, full motion only):
 *  - Magic Card spotlight: the panel under the pointer (.card-surface / .spot) gets --sx/--sy and .spot-on,
 *    and motion.css paints a soft glow plus a lit stretch of border around that point.
 *  - Dot Pattern: the fixed dot field lights up the dots around the pointer (a small lens moved by transform,
 *    so nothing repaints).
 * One listener, one rAF per frame at most.
 */
export function Interact() {
  const { reduce, touch, ready } = useMotionPref();
  const on = ready && !reduce && !touch;

  useEffect(() => {
    if (!on) return;
    const lens = document.querySelector<HTMLElement>(".dot-lens");
    const lensIn = lens?.firstElementChild as HTMLElement | null;
    const R = 170; // half the lens size in motion.css
    let hot: HTMLElement | null = null;
    let x = 0;
    let y = 0;
    let target: Element | null = null;
    let raf = 0;
    // The hot card's box is read once when the pointer enters it (and again after a scroll or resize), never per
    // frame: a read after the previous frame's style writes forces a full style + layout pass.
    let box: DOMRect | null = null;
    const invalidate = () => (box = null);
    let next: HTMLElement | null = null;
    const frame = () => {
      raf = 0;
      const card = next;
      if (card !== hot) {
        hot?.classList.remove("spot-on");
        hot = card;
        card?.classList.add("spot-on");
      }
      if (card && box) {
        card.style.setProperty("--sx", `${(x - box.left).toFixed(0)}px`);
        card.style.setProperty("--sy", `${(y - box.top).toFixed(0)}px`);
      }
      if (lens && lensIn) {
        lens.style.transform = `translate3d(${x - R}px, ${y - R}px, 0)`;
        lensIn.style.transform = `translate3d(${R - x}px, ${R - y}px, 0)`;
      }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      target = e.target as Element | null;
      const card = target?.closest?.<HTMLElement>(".card-surface, .spot") ?? null;
      // measure here, in the input event (styles are clean), not in the frame callback after other writes
      if (card !== next || (card && !box)) box = card ? card.getBoundingClientRect() : null;
      next = card;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const leave = () => {
      hot?.classList.remove("spot-on");
      hot = null;
      if (lens) lens.style.transform = "translate3d(-600px, -600px, 0)";
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", invalidate, { passive: true, capture: true });
    window.addEventListener("resize", invalidate);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", invalidate, { capture: true });
      window.removeEventListener("resize", invalidate);
      document.documentElement.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
      leave();
    };
  }, [on]);

  return (
    <div aria-hidden className="dotfield">
      <i className="dot-lens">
        <i />
      </i>
    </div>
  );
}
