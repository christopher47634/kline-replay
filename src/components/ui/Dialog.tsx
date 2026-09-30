"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

/**
 * Modal built on <dialog> (focus trap, Esc, backdrop click). It grows out of the element matching `originSelector`
 * (320ms) and shrinks back into it on close (240ms). The backdrop is dark glass (blur 20px). Reduced motion: no scaling.
 */
export function Dialog({
  open,
  onClose,
  children,
  className = "",
  label,
  originSelector,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  label: string;
  originSelector?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Keep the content mounted while the closing animation plays.
  const [mounted, setMounted] = useState(open);
  const closing = useRef(false);

  const originOffset = (d: HTMLDialogElement) => {
    const el = originSelector ? document.querySelector(originSelector) : null;
    if (!el) return null;
    const t = el.getBoundingClientRect();
    const r = d.getBoundingClientRect();
    return { x: t.left + t.width / 2 - r.left, y: t.top + t.height / 2 - r.top };
  };

  // unmounted while open (e.g. the page navigates to the result): give the custom cursor back
  useEffect(() => () => document.documentElement.classList.remove("dialog-open"), []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const reduce = document.documentElement.dataset.reduceMotion === "1";
    // Clear every earlier animation first. The close animation fills forwards (so the card does not flash back at
    // full size before close()); if it were left in place, the next open would end at opacity 0 / scale 0.5 —
    // a grey backdrop with no card from the second settlement on.
    d.getAnimations().forEach((a) => a.cancel());
    if (open) {
      setMounted(true);
      closing.current = false;
      if (!d.open) d.showModal();
      document.documentElement.classList.add("dialog-open"); // native cursor while the dialog is up (globals.css)
      if (!reduce) {
        const o = originOffset(d);
        if (o) d.style.transformOrigin = `${o.x}px ${o.y}px`;
        d.animate([{ transform: "scale(0.5)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 320, easing: EASE_OUT });
      }
    } else if (d.open && !closing.current) {
      closing.current = true;
      const finish = () => {
        d.close();
        document.documentElement.classList.remove("dialog-open");
        d.getAnimations().forEach((a) => a.cancel());
        setMounted(false);
        closing.current = false;
      };
      if (reduce) return finish();
      const o = originOffset(d);
      if (o) d.style.transformOrigin = `${o.x}px ${o.y}px`;
      d.animate([{ transform: "none", opacity: 1 }, { transform: "scale(0.5)", opacity: 0 }], { duration: 240, easing: EASE_IN_OUT, fill: "forwards" }).onfinish = finish;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-32px)] max-w-lg rounded-2xl border border-line p-0 text-ink bg-[rgb(13_17_23/0.94)] backdrop:bg-black/60 backdrop:backdrop-blur-[20px] ${className}`}
      style={{ boxShadow: "inset 0 1px 0 var(--color-line-hi), 0 24px 80px rgb(0 0 0 / 0.6)" }}
    >
      {mounted ? children : null}
    </dialog>
  );
}
