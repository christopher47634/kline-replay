"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Moment, MomentOption } from "@/game/moment";
import { REASONS } from "@/game/notes";
import type { ReasonId } from "@/game/types";

/** Types `text` out one character at a time (instantly under reduced motion). */
function useTypewriter(text: string, ms = 60) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setN(text.length);
      return;
    }
    setN(0);
    const t = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(t), v) : v + 1)), ms);
    return () => clearInterval(t);
  }, [text, ms]);
  return text.slice(0, n);
}

/**
 * Full-screen "historical moment" card shown before a round; the choice only pre-fills the allocation.
 * The player can also tag why (optional): the year-end replay plays it back next to what they finally submitted.
 */
export function MomentCard({ moment, onChoose }: { moment: Moment; onChoose: (o: MomentOption, index: number, reason: ReasonId | null) => void }) {
  const date = useTypewriter(moment.date);
  const [reason, setReason] = useState<ReasonId | null>(null);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="历史时刻" className="fixed inset-0 z-[70] moment-scrim backdrop-blur-xl grid place-items-center p-4 overflow-y-auto" data-testid="moment-card">
      <div
        className="moment-sheet w-full max-w-[560px] p-1.5 rounded-2xl"
      >
        <div
          className="moment-inner rounded-xl p-6 md:p-8"
        >
          <p className="text-xs tracking-[0.3em] text-center" style={{ color: "var(--archive-sub)" }}>
            历 史 时 刻
          </p>
          <p className="num mt-3 text-center text-2xl md:text-3xl font-black min-h-[1.5em]" data-testid="moment-date">
            {date}
            <span className="animate-pulse">{date.length < moment.date.length ? "▌" : ""}</span>
          </p>
          <h2 className="mt-3 text-center text-xl md:text-2xl font-black leading-snug">{moment.title}</h2>
          <hr className="my-4" />
          <p className="text-[15px] leading-relaxed">{moment.text}</p>
          <p className="mt-5 text-sm font-bold">此刻你最看重的是？<span className="font-normal" style={{ color: "var(--archive-sub)" }}>（可选，年终回放会提到）</span></p>
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="此刻你最看重的是">
            {REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={reason === r.id}
                onClick={() => setReason(reason === r.id ? null : r.id)}
                className="archive-option press h-8 rounded-full border px-3 text-[13px] transition-colors"
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="mt-5 font-bold">{moment.question}</p>
          <div className="mt-3 grid gap-2">
            {moment.options.map((o, i) => (
              <button
                key={o.label}
                type="button"
                onClick={() => onChoose(o, i, reason)}
                className="moment-option h-12 rounded-md font-bold text-[15px] border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-center" style={{ color: "var(--archive-sub)" }}>
            选择只会预填本月仓位，之后仍可自由调整
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
