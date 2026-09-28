"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Minimal modal built on <dialog>: focus trap, Esc to close, backdrop click to close. */
export function Dialog({
  open,
  onClose,
  children,
  className = "",
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  label: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
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
      className={`m-auto w-[calc(100%-32px)] max-w-lg rounded-2xl bg-card text-ink border border-line p-0 backdrop:bg-black/70 ${className}`}
    >
      {open ? children : null}
    </dialog>
  );
}
