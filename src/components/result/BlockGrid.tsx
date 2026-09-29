"use client";

import { motion } from "motion/react";
import { useMotionPref } from "@/components/shell/MotionPref";
import type { RoundRecord, Script } from "@/game/types";
import { pct, shortMonth } from "@/lib/format";

/** Twelve squares that spring in one by one (30ms apart); a liquidated month breathes purple. */
export function BlockGrid({ script, history }: { script: Script; history: RoundRecord[] }) {
  const { reduce } = useMotionPref();
  return (
    <ol aria-label="每月盈亏方块" className="grid grid-cols-6 gap-1.5 md:grid-cols-12">
      {history.map((h, i) => {
        const kind = h.liquidated ? "强平" : h.pnl >= 0 ? "盈" : "亏";
        const color = h.liquidated ? "bg-[#A855F7]" : h.pnl >= 0 ? "bg-up" : "bg-down";
        const tip = `${shortMonth(script.months[h.month].label)} ${pct(h.pnl)}${h.liquidated ? "（强平）" : ""}`;
        return (
          <li key={h.month} data-testid="block" title={tip} className="group relative">
            <motion.span
              className={`block aspect-square rounded-md ${color} ${h.liquidated && !reduce ? "block-breathe" : ""}`}
              aria-label={`${tip}，${kind}`}
              initial={reduce ? false : { scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              transition={{ type: "spring", stiffness: 380, damping: 16, delay: i * 0.03 }}
            />
            <span className="num pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded border border-line bg-bg px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100">{tip}</span>
          </li>
        );
      })}
    </ol>
  );
}
