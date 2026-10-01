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
    <div role="dialog" aria-modal="true" aria-label="历史时刻" className="fixed inset-0 z-[70] bg-[#07090c]/95 grid place-items-center p-4 overflow-y-auto" data-testid="moment-card">
      <div
        className="w-full max-w-[560px] p-1.5 rounded-sm"
        style={{ background: "#d9cfb8", boxShadow: "0 0 0 1px #8a7f68, 0 20px 60px rgba(0,0,0,.6)" }}
      >
        <div
          className="rounded-sm p-6 md:p-8"
          style={{
            color: "#2a2418",
            border: "3px double #5e553f",
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(90,75,40,.06) 0 1px, transparent 1px 3px), radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,.35), transparent 70%)",
          }}
        >
          <p className="text-xs tracking-[0.3em] text-center" style={{ color: "#6b5f45" }}>
            历 史 时 刻
          </p>
          <p className="num mt-3 text-center text-2xl md:text-3xl font-black min-h-[1.5em]" data-testid="moment-date">
            {date}
            <span className="animate-pulse">{date.length < moment.date.length ? "▌" : ""}</span>
          </p>
          <h2 className="mt-3 text-center text-xl md:text-2xl font-black leading-snug">{moment.title}</h2>
          <hr className="my-4" style={{ borderColor: "#5e553f" }} />
          <p className="text-[15px] leading-relaxed">{moment.text}</p>
          <p className="mt-5 text-sm font-bold">此刻你最看重的是？<span className="font-normal" style={{ color: "#6b5f45" }}>（可选，年终回放会提到）</span></p>
          <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="此刻你最看重的是">
            {REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={reason === r.id}
                onClick={() => setReason(reason === r.id ? null : r.id)}
                className={`press h-8 rounded-full border px-3 text-[13px] transition-colors ${reason === r.id ? "border-[#2a2418] bg-[#2a2418] text-[#f2ead6]" : "border-[#8a7f68] hover:border-[#2a2418]"}`}
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
                className="h-12 rounded-md font-bold text-[15px] border-2 transition-colors hover:bg-[#2a2418] hover:text-[#f2ead6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a1f1f]"
                style={{ borderColor: "#2a2418" }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-center" style={{ color: "#6b5f45" }}>
            选择只会预填本月仓位，之后仍可自由调整
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
