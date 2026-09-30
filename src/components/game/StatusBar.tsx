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
  return (
    <motion.div initial={{ y: "-100%" }} animate={{ y: 0 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} className="sticky top-0 z-20 -mx-4 px-4 md:-mx-6 md:px-6 bg-bg/90 backdrop-blur border-b border-line">
      {/* Phone: one fixed 44px line so the bar never eats into the cards below. */}
      <div className="md:hidden h-11 pr-20 flex items-center justify-between gap-2 text-sm whitespace-nowrap overflow-hidden" data-testid="status-compact">
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
      </div>
      <div className="hidden md:flex flex-wrap items-center gap-x-5 gap-y-1 text-sm py-3">
        <span>
          第{" "}
          <b className="num text-ink text-base">
            <Flip value={String(round)} />
          </b>{" "}
          回合 <span className="text-sub num">/ {total}</span>
        </span>
        <span className="text-sub">｜</span>
        <Flip value={label} className="font-medium" />
        <span className="text-sub">｜</span>
        <span>
          <span className="text-sub">总资产 </span>
          <span data-zoom data-zoom-value={yuan(cash)} data-zoom-label={`总资产 · 累计 ${pct(totalRet)}`} data-zoom-tone={totalRet > 0 ? "up" : totalRet < 0 ? "down" : undefined}>
            <RollingNumber value={cash} format={yuan} className="text-base font-bold" />
          </span>
        </span>
        {lastPnl !== null && (
          <>
            <span className="text-sub">｜</span>
            <span>
              <span className="text-sub">上月 </span>
              <span className={`num font-bold ${upDownColor(lastPnl)}`} data-zoom data-zoom-label="上月盈亏" data-zoom-tone={lastPnl > 0 ? "up" : lastPnl < 0 ? "down" : undefined}>
                {pct(lastPnl)}
              </span>
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
}
