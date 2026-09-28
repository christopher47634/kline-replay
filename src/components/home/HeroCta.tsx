"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { btn } from "@/components/ui/Button";
import { peekSaved, storageKey } from "@/game/store";

/** "开始穿越", or "继续上次（第 N 月）" when an unfinished game is saved. */
export function HeroCta({ scriptId }: { scriptId: string }) {
  const [saved, setSaved] = useState<{ month: number } | null>(null);
  useEffect(() => {
    const s = peekSaved(scriptId);
    if (s && s.started && !s.finished) setSaved({ month: s.month + 1 });
  }, [scriptId]);

  return (
    <div className="mt-10 flex flex-wrap items-center gap-4">
      <Link href={`/play/${scriptId}`} className={btn("primary", "h-12 px-8 text-base")}>
        {saved ? `继续上次（第 ${saved.month} 月）` : "开始穿越"}
      </Link>
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
