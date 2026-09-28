"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { fetchComment } from "@/lib/comment";
import { pct, upDownColor, yuan } from "@/lib/format";
import type { LastSettle } from "@/game/store";
import { ASSET_IDS, type Script } from "@/game/types";

export function SettleDialog({ script, last, open, onClose, isFinal }: { script: Script; last: LastSettle | null; open: boolean; onClose: () => void; isFinal: boolean }) {
  const [comment, setComment] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !last) return;
    let alive = true;
    setComment(null);
    fetchComment({
      scriptId: script.id,
      month: last.month,
      allocBefore: last.allocBefore,
      allocAfter: last.alloc,
      pnl: last.pnl,
      marketReturn: script.months[last.month].marketReturn,
    }).then((t) => alive && setComment(t));
    return () => {
      alive = false;
    };
  }, [open, last, script]);

  if (!last) return null;
  const month = script.months[last.month];
  const names = Object.fromEntries(script.assets.map((a) => [a.id, a.name]));
  const rows = ASSET_IDS.filter((id) => last.alloc[id] > 0).map((id) => {
    const start = last.cashBefore * (last.alloc[id] / 100);
    return { id, name: names[id], gain: last.parts[id] - start, ret: start > 0 ? last.parts[id] / start - 1 : 0 };
  });

  return (
    <Dialog open={open} onClose={onClose} label="本月结算" className={last.liquidated ? "!border-up border-2" : ""}>
      <div className="p-5 sm:p-6">
        <p className="text-sm text-sub">{month.label} · 结算</p>
        <h2 className={`mt-1 text-xl font-bold ${last.liquidated ? "text-up" : ""}`}>{last.liquidated ? "融资仓位被强平" : "本月盈亏"}</h2>
        <p className={`num mt-3 text-5xl font-black tracking-tight ${upDownColor(last.pnl)}`}>{pct(last.pnl)}</p>
        <p className="num mt-1 text-sm text-sub">
          {yuan(last.cashBefore)} → <span className="text-ink">{yuan(last.cashAfter)}</span>
        </p>

        <ul className="mt-5 divide-y divide-line border-y border-line">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {r.name} <span className="num text-sub">{last.alloc[r.id]}%</span>
              </span>
              <span className={`num ${upDownColor(r.gain)}`}>
                {r.id === "margin" && last.liquidated ? "强平归零" : pct(r.ret)} <span className="text-sub">({r.gain >= 0 ? "+" : "−"}{yuan(Math.abs(r.gain)).slice(2)})</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-lg bg-bg p-3 text-sm leading-relaxed">
          <p className="text-xs text-sub mb-1">事后复盘</p>
          <p>{month.hindsight}</p>
        </div>
        <div className="mt-3 flex gap-3 items-start text-sm min-h-10">
          <span className="text-xs text-sub shrink-0 pt-0.5">老股民说</span>
          {comment ? (
            <p className="fade-in">{comment}</p>
          ) : (
            <span aria-label="点评加载中" className="h-4 w-2/3 rounded bg-line animate-pulse mt-0.5" />
          )}
        </div>

        <Button className="mt-6 w-full h-11" onClick={onClose} autoFocus>
          {isFinal ? "查看年终结算 →" : "进入下个月 →"}
        </Button>
      </div>
    </Dialog>
  );
}
