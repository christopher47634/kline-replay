"use client";

import { m as motion } from "motion/react";
import { useEffect, useState } from "react";
import { Odometer } from "@/components/motion/Odometer";
import { Reveal } from "@/components/motion/Reveal";
import { useMotionPref } from "@/components/shell/MotionPref";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { fetchComment } from "@/lib/comment";
import { pct, upDownColor, yuan } from "@/lib/format";
import { haptic, play } from "@/lib/sfx";
import type { LastSettle } from "@/game/store";
import { ASSET_IDS, type Script } from "@/game/types";

const signedPct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`;

/** Types the veteran's comment at 18ms per character (instantly under reduced motion). */
function TypedComment({ text }: { text: string }) {
  const { reduce } = useMotionPref();
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) return setN(text.length);
    setN(0);
    const iv = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(iv), v) : v + 1)), 18);
    return () => clearInterval(iv);
  }, [text, reduce]);
  return (
    <p aria-label={text}>
      <span aria-hidden>{text.slice(0, n)}</span>
    </p>
  );
}

export function SettleDialog({ script, last, open, onClose, isFinal }: { script: Script; last: LastSettle | null; open: boolean; onClose: () => void; isFinal: boolean }) {
  const { reduce } = useMotionPref();
  const [comment, setComment] = useState<string | null>(null);
  const [glow, setGlow] = useState(false);

  useEffect(() => {
    if (!open || !last) return;
    let alive = true;
    setComment(null);
    setGlow(false);
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

  if (!last) return <Dialog open={false} onClose={onClose} label="本月结算">{null}</Dialog>;
  const month = script.months[last.month];
  const names = Object.fromEntries(script.assets.map((a) => [a.id, a.name]));
  const rows = ASSET_IDS.filter((id) => last.alloc[id] > 0).map((id) => {
    const start = last.cashBefore * (last.alloc[id] / 100);
    return { id, name: names[id], gain: last.parts[id] - start, ret: start > 0 ? last.parts[id] / start - 1 : 0 };
  });

  // The big number lands: outer glow once (0.3s) + the up / down sound and a buzz.
  const landed = () => {
    setGlow(true);
    setTimeout(() => setGlow(false), 300);
    if (last.liquidated) return; // the bust sound already played with the screen effects
    play(last.pnl >= 0 ? "up" : "down");
    haptic("settle");
  };
  const glowColor = last.pnl >= 0 ? "var(--color-up-glow)" : "var(--color-down-glow)";

  return (
    <Dialog open={open} onClose={onClose} label="本月结算" originSelector="[data-testid='next-month']" className={last.liquidated ? "!border-up border-2 bust-glow" : ""}>
      <div className="p-5 sm:p-6">
        <p className="text-sm text-sub">{month.label} · 结算</p>
        <h2 className={`mt-1 text-xl font-bold ${last.liquidated ? "text-up" : ""}`}>{last.liquidated ? "融资仓位被强平" : "本月盈亏"}</h2>
        <p className={`mt-3 text-5xl font-black tracking-tight ${upDownColor(last.pnl)}`} style={{ textShadow: glow ? `0 0 24px ${glowColor}, 0 0 4px ${glowColor}` : "none", transition: "text-shadow 150ms" }} data-testid="settle-pnl">
          <Odometer value={last.pnl * 100} format={signedPct} duration={900} from={0} className="num" onDone={landed} />
        </p>
        <p className="num mt-1 text-sm text-sub">
          {yuan(last.cashBefore)} → <span className="text-ink">{yuan(last.cashAfter)}</span>
        </p>

        <ul className="mt-5 divide-y divide-line border-y border-line">
          {rows.map((r, i) => (
            <motion.li
              key={r.id}
              initial={reduce ? false : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduce ? 0 : 0.3 + i * 0.04, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span>
                {r.name} <span className="num text-sub">{last.alloc[r.id]}%</span>
              </span>
              <span className={`num ${upDownColor(r.gain)}`}>
                {r.id === "margin" && last.liquidated ? "强平归零" : pct(r.ret)}{" "}
                <span className="text-sub">
                  (<Odometer value={Math.abs(r.gain)} format={(n) => `${r.gain >= 0 ? "+" : "−"}${Math.round(n).toLocaleString("en-US")}`} duration={700} />)
                </span>
              </span>
            </motion.li>
          ))}
        </ul>

        <div className="mt-4 rounded-lg bg-bg p-3 text-sm leading-relaxed">
          <p className="mb-1 text-xs text-sub">事后复盘</p>
          <Reveal as="p" delay={0.5}>
            {month.hindsight}
          </Reveal>
        </div>
        <div className="mt-3 flex min-h-10 items-start gap-3 text-sm">
          <span className="shrink-0 pt-0.5 text-xs text-sub">老股民说</span>
          {comment ? <TypedComment text={comment} /> : <span aria-label="点评加载中" className="mt-0.5 h-4 w-2/3 animate-pulse rounded bg-line" />}
        </div>

        <Button className="mt-6 h-11 w-full" onClick={onClose} autoFocus>
          {isFinal ? "查看年终结算 →" : "进入下个月 →"}
        </Button>
      </div>
    </Dialog>
  );
}
