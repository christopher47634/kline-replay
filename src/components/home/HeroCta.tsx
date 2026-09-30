"use client";

import { useEffect, useState } from "react";
import { MagneticLink } from "@/components/motion/Magnetic";
import { peekSaved, storageKey } from "@/game/store";

/** "开始穿越", or "继续上次（第 N 月）" when an unfinished game is saved. Magnetic, gold gradient with a 1px outer glow on hover. */
export function HeroCta({ scriptId }: { scriptId: string }) {
  const [saved, setSaved] = useState<{ month: number } | null>(null);
  useEffect(() => {
    const s = peekSaved(scriptId);
    if (s && s.started && !s.finished) setSaved({ month: s.month + 1 });
  }, [scriptId]);

  return (
    <div className="mt-10 flex flex-wrap items-center gap-5">
      <MagneticLink
        href={`/play/${scriptId}`}
        className="shine relative inline-flex h-14 items-center justify-center rounded-xl bg-gradient-to-b from-[#FFC933] to-gold px-10 text-lg font-bold text-bg transition-shadow duration-150 hover:shadow-[0_0_0_1px_rgb(245_180_0/0.9),0_0_28px_rgb(245_180_0/0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <span aria-hidden className="beam" style={{ "--beam": "#ffffff" } as React.CSSProperties} />
        {saved ? `继续上次（第 ${saved.month} 月）` : "开始穿越"}
      </MagneticLink>
      {saved && (
        <button
          type="button"
          className="text-sm text-sub underline underline-offset-4 hover:text-ink"
          onClick={() => {
            try {
              localStorage.removeItem(storageKey(scriptId));
            } catch {}
            location.href = `/play/${scriptId}`;
          }}
        >
          重新开始
        </button>
      )}
    </div>
  );
}
