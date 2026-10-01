"use client";

import { useEffect, useState, memo } from "react";
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
export const HeadlineCard = memo(function HeadlineCard({ headline, lead, monthNo }: { headline: Headline; lead?: boolean; monthNo: number }) {
  const stamp = `${monthNo}月${headline.day}日`;
  return (
    <article className="headline-card spot group relative overflow-hidden rounded-xl border border-line bg-card py-3 pl-4 pr-4 transition-[transform,background-color,border-color] duration-150 hover:-translate-y-0.5 hover:bg-elev hover:border-mute" style={{ boxShadow: "inset 0 1px 0 var(--color-line-hi)" }}>
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
});

/**
 * The forum veteran, an Open Peeps illustration (Pablo Stanley, CC0; scripts/build_art.mjs): a suspicious look, and
 * every ~3 s a double take (the "awe" face) for a beat. Two stacked images, the second shown by the laoge-eyes keyframes.
 */
function Laoge() {
  const { reduce } = useMotionPref();
  return (
    // Open Peeps are black-ink drawings: a warm paper disc keeps the hat and hair readable on the dark skin
    <span aria-hidden className={`laoge relative block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#efe6d2] ring-1 ring-line ${reduce ? "" : "laoge-eyes"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/art/laoge.svg" alt="" width={40} height={40} className="eyes-squint absolute inset-0 h-full w-full" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/art/laoge-wow.svg" alt="" width={40} height={40} className="eyes-wide absolute inset-0 h-full w-full" />
    </span>
  );
}

type Stance = "trust" | "doubt";

/**
 * The rumour, plus an optional stance (「我更相信这条 / 暂不采信」, tap again to clear). The settle dialog answers it
 * with three separate facts: did it come true, did the asset move its way, did you act on it.
 */
export const RumorCard = memo(function RumorCard({
  text,
  month,
  stance,
  onStance,
}: {
  text: string;
  month?: number;
  stance?: Stance;
  onStance?: (month: number, patch: { rumor: Stance | undefined }) => void;
}) {
  const pick = (v: Stance) => month !== undefined && onStance?.(month, { rumor: stance === v ? undefined : v });
  return (
    <article className="rumor-card spot rounded-xl border border-dashed border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <Laoge />
        <span className="text-sm font-medium">股吧老哥</span>
        <span className="ml-auto rounded-full bg-gold/15 px-2 py-0.5 text-[11px] text-gold">小道消息</span>
      </div>
      <p className="mt-3 text-[15px] italic leading-relaxed">“{text}”</p>
      <p className="mt-2 text-xs text-sub">可能是真的，也可能是噪音</p>
      {onStance && (
        <div className="mt-3 flex gap-2" role="radiogroup" aria-label="你信不信这条消息">
          {(
            [
              ["trust", "我更相信这条"],
              ["doubt", "暂不采信"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={stance === v}
              onClick={() => pick(v)}
              className={`press h-8 flex-1 rounded-md border text-xs transition-colors ${stance === v ? (v === "trust" ? "border-gold bg-gold/15 text-gold" : "border-sub bg-sub/10 text-ink") : "border-line text-sub hover:border-sub"}`}
            >
              {l}
            </button>
          ))}
        </div>
      )}
    </article>
  );
});
