"use client";

import { AnimatePresence, m as motion } from "motion/react";
import { pct, upDownColor, yuan } from "@/lib/format";
import { RollingNumber } from "./RollingNumber";

/** Text that flips like a departure board: the old value rolls up and out, the new one rolls in from below. */
function Flip({ value, className }: { value: string; className?: string }) {
  return (
    <span className={`relative inline-flex overflow-hidden align-bottom ${className ?? ""}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "-100%", opacity: 0 }} transition={{ duration: 0.32, ease: [0.65, 0, 0.35, 1] }} className="inline-block">
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function StatusBar({
  round,
  total,
  label,
  cash,
  startCash,
  lastPnl,
}: {
  round: number;
  total: number;
  label: string;
  cash: number;
  startCash: number;
  lastPnl: number | null;
}) {
  const totalRet = cash / startCash - 1;
  const monthOnly = label.replace(/^\d+ 年 /, "");
  const tone = (v: number) => (v > 0 ? "up" : v < 0 ? "down" : undefined);
  return (
    <motion.div initial={{ y: "-100%" }} animate={{ y: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} className="sticky top-0 z-20 -mx-4 px-2 pt-1.5 md:-mx-6 md:px-4 md:pt-2">
      {/* A floating glass bar over the page (the content scrolls under it). Right margin: the two fixed buttons. */}
      <div className="lg relative mr-[5.25rem] rounded-2xl border border-line bg-card/90 backdrop-blur xl:mr-0" style={{ "--lg-flex": 1.01 } as React.CSSProperties}>
        <span key={round} aria-hidden className="sb-sweep" />
        {/* Phone: one fixed 40px line so the bar never eats into the cards below. */}
        <div className="md:hidden h-10 px-3 flex items-center justify-between gap-2 text-sm whitespace-nowrap overflow-hidden" data-testid="status-compact">
          <span>
            第{" "}
            <b className="num">
              <Flip value={String(round)} />
            </b>{" "}
            回合 · <Flip value={monthOnly} />
          </span>
          <span className="flex items-center gap-2">
            <RollingNumber value={cash} format={yuan} className="font-bold" />
            <span className={`num font-bold ${upDownColor(totalRet)}`}>{pct(totalRet)}</span>
          </span>
          <span className="sb-bar" aria-hidden>
            <i style={{ width: `${(round / total) * 100}%` }} />
          </span>
        </div>
        {/* Desktop: where you are on the left, how you are doing on the right; small label above each value. */}
        <div className="hidden md:flex items-center gap-8 px-5 py-2">
          <div>
            <span className="sb-k">回合</span>
            <span className="sb-v">
              <b className="num text-lg text-ink">
                <Flip value={String(round)} />
              </b>
              <span className="num text-sub"> / {total}</span>
            </span>
          </div>
          <div>
            <span className="sb-k">现在是</span>
            <span className="sb-v">
              <Flip value={label} className="font-semibold" />
            </span>
            <span className="sb-ticks" role="img" aria-label={`第 ${round} 个月，共 ${total} 个月`}>
              {Array.from({ length: total }, (_, i) => (
                <i key={i} className={i + 1 < round ? "done" : i + 1 === round ? "now" : ""} />
              ))}
            </span>
          </div>
          <div className="ml-auto flex items-end gap-8 text-right">
            {lastPnl !== null && (
              <div>
                <span className="sb-k">上月</span>
                <span className={`sb-v num font-bold ${upDownColor(lastPnl)}`} data-zoom data-zoom-label="上月盈亏" data-zoom-tone={tone(lastPnl)}>
                  {pct(lastPnl)}
                </span>
              </div>
            )}
            <div>
              <span className="sb-k">累计</span>
              <span className={`sb-v num font-bold ${upDownColor(totalRet)}`}>{pct(totalRet)}</span>
            </div>
            <div>
              <span className="sb-k">总资产</span>
              <span className="sb-v" data-zoom data-zoom-value={yuan(cash)} data-zoom-label={`总资产 · 累计 ${pct(totalRet)}`} data-zoom-tone={tone(totalRet)}>
                <RollingNumber value={cash} format={yuan} className="text-lg font-bold" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
