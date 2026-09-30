"use client";

import { useEffect, useState } from "react";
import { useMotionPref } from "@/components/shell/MotionPref";
import type { Headline, Tone } from "@/game/types";

const BAR: Record<Tone, string> = { bull: "bg-up", bear: "bg-down", neutral: "bg-sub" };
const TONE_LABEL: Record<Tone, string> = { bull: "偏多", bear: "偏空", neutral: "中性" };

/** Types `text` out over `ms` in total (instant under reduced motion). */
function Typed({ text, ms = 400, delay = 0 }: { text: string; ms?: number; delay?: number }) {
  const { reduce } = useMotionPref();
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) {
      setN(text.length);
      return;
    }
    setN(0);
    const step = Math.max(24, ms / text.length);
    let i = 0;
    let iv: ReturnType<typeof setInterval>;
    const t = setTimeout(() => {
      iv = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length) clearInterval(iv);
      }, step);
    }, delay);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
    };
  }, [text, ms, delay, reduce]);
  return (
    <>
      <span aria-hidden>{text.slice(0, n)}</span>
      <span className="sr-only">{text}</span>
    </>
  );
}

/** A headline: tone-colored bar (3px → 5px on hover), outlet, and a date stamp in the (already past) previous month. */
export function HeadlineCard({ headline, lead, monthNo }: { headline: Headline; lead?: boolean; monthNo: number }) {
  const stamp = `${monthNo}月${headline.day}日`;
  return (
    <article className="spot group relative overflow-hidden rounded-xl border border-line bg-card py-3 pl-4 pr-4 transition-[transform,background-color,border-color] duration-150 hover:-translate-y-0.5 hover:bg-elev hover:border-mute" style={{ boxShadow: "inset 0 1px 0 var(--color-line-hi)" }}>
      <span aria-hidden className={`absolute bottom-3 left-0 top-3 w-[3px] rounded-r transition-[width] duration-150 group-hover:w-[5px] ${BAR[headline.tone]}`} />
      <div className="flex items-center gap-2 text-xs text-sub">
        {lead && <span className="rounded bg-up/15 px-1.5 py-0.5 font-medium text-up">头条</span>}
        <span>{headline.outlet}</span>
        <span className="num ml-auto">{lead ? <Typed text={stamp} ms={400} delay={350} /> : stamp}</span>
      </div>
      <p className={`tfx mt-1.5 font-bold leading-snug ${lead ? "text-[17px]" : "text-[15px]"}`} aria-label={headline.text}>
        {/* Text Effect: each character sharpens in turn when the month's headlines arrive */}
        {Array.from(headline.text).map((c, i) => (
          <span key={i} aria-hidden style={{ "--i": i } as React.CSSProperties}>
            {c}
          </span>
        ))}
      </p>
      <span className="sr-only">{TONE_LABEL[headline.tone]}</span>
    </article>
  );
}

/** The forum veteran: eyes squint, and every ~3 s they go wide for a beat. */
function Laoge() {
  const { reduce } = useMotionPref();
  return (
    <svg viewBox="0 0 64 64" width={36} height={36} fill="none" aria-hidden className="rounded-full">
      <rect width="64" height="64" rx="32" fill="#1C2430" />
      <g fill="#8B95A3">
        <path d="M17 26c1-8 7-13 15-13s14 5 15 13z" />
        <path d="M14 26.5h36c1.4 0 2 .9 1.4 1.8-.5.8-1.4 1.2-2.4 1.2H15c-1 0-1.9-.4-2.4-1.2-.6-.9 0-1.8 1.4-1.8z" />
        <path d="M20 30h24c0 9-5 15-12 15s-12-6-12-15z" />
        <path d="M10 64c1-10 9-16 22-16s21 6 22 16z" />
      </g>
      <g className={reduce ? "" : "laoge-eyes"}>
        <path className="eyes-squint" d="M25 34.5h4M35 34.5h4" stroke="#1C2430" strokeWidth="1.6" strokeLinecap="round" />
        <g className="eyes-wide" fill="#1C2430">
          <circle cx="27" cy="34.5" r="2" />
          <circle cx="37" cy="34.5" r="2" />
        </g>
      </g>
      <path d="M29 40.5c1.5.8 3.5.8 5 0" stroke="#1C2430" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M33.5 40.2l9-2.6" stroke="#E6E8EB" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function RumorCard({ text }: { text: string }) {
  return (
    <article className="spot rounded-xl border border-dashed border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <Laoge />
        <span className="text-sm font-medium">股吧老哥</span>
        <span className="ml-auto rounded-full bg-gold/15 px-2 py-0.5 text-[11px] text-gold">小道消息</span>
      </div>
      <p className="mt-3 text-[15px] italic leading-relaxed">“{text}”</p>
      <p className="mt-2 text-xs text-sub">可能是真的，也可能是噪音</p>
    </article>
  );
}
