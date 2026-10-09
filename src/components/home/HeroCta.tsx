"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MagneticLink } from "@/components/motion/Magnetic";
import { peekSaved, storageKey } from "@/game/store";

/**
 * Main CTA: "开始穿越" (2015), or "继续上次" when any year has an unfinished game saved (the most advanced one).
 * Below it, the two other ways in for a returning player: a quick 大事件 question, or straight to the year list.
 * Magnetic, gold gradient with a 1px outer glow on hover.
 */
export function HeroCta({ scriptId, years = [scriptId] }: { scriptId: string; years?: string[] }) {
  const [saved, setSaved] = useState<{ id: string; month: number } | null>(null);
  useEffect(() => {
    let best: { id: string; month: number } | null = null;
    for (const id of years) {
      const s = peekSaved(id);
      if (s && s.started && !s.finished && (!best || s.month + 1 > best.month)) best = { id, month: s.month + 1 };
    }
    setSaved(best);
  }, [years]);
  const id = saved?.id ?? scriptId;

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center gap-5">
        <MagneticLink
          href={`/play/${id}`}
          className="hero-primary shine relative inline-flex h-14 items-center justify-center rounded-xl bg-gradient-to-b from-[#FFC933] to-gold px-10 text-lg font-bold text-bg transition-shadow duration-150 hover:shadow-[0_0_0_1px_rgb(245_180_0/0.9),0_0_28px_rgb(245_180_0/0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <span aria-hidden className="beam" style={{ "--beam": "#ffffff" } as React.CSSProperties} />
          {saved ? `继续上局（${saved.id} · 第 ${saved.month} 月）` : "开始穿越 ↗"}
        </MagneticLink>
        {saved && (
          <button
            type="button"
            className="text-sm text-sub underline underline-offset-4 hover:text-ink"
            onClick={() => {
              try {
                localStorage.removeItem(storageKey(saved.id));
              } catch {}
              location.href = `/play/${saved.id}`;
            }}
          >
            重新开始
          </button>
        )}
      </div>
      <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-sub" data-testid="hero-more">
        <Link href="/events/a-share-classics" className="underline-offset-4 hover:text-ink hover:underline">
          快速猜一题：一个历史事件，猜之后 20 天涨还是跌 →
        </Link>
        <a href="#years" className="underline-offset-4 hover:text-ink hover:underline">
          选年份 · 开盲盒 ↓
        </a>
      </p>
    </div>
  );
}
