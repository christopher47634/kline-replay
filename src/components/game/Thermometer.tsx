"use client";

import { useEffect, useState } from "react";
import { useMotionPref } from "@/components/shell/MotionPref";
import { pct } from "@/lib/format";

// theme colours, so 阅读设置 → 涨跌颜色 flips them too
const CELLS = [
  "color-mix(in oklab, var(--color-down) 70%, black)",
  "color-mix(in oklab, var(--color-down) 45%, var(--color-mute))",
  "var(--color-mute)",
  "color-mix(in oklab, var(--color-up) 45%, var(--color-mute))",
  "color-mix(in oklab, var(--color-up) 80%, black)",
];

/** 0..4 bucket of last month's market return: <=-8% / -8~-2 / -2~2 / 2~8 / >=8%. */
export function tempLevel(r: number): number {
  if (r <= -0.08) return 0;
  if (r < -0.02) return 1;
  if (r <= 0.02) return 2;
  if (r < 0.08) return 3;
  return 4;
}

/** Five cells light up left to right (60ms apart) up to last month's level; the target cell pulses once. */
export function Thermometer({ ret, monthNo }: { ret: number; monthNo: number }) {
  const level = tempLevel(ret);
  const { reduce } = useMotionPref();
  const [lit, setLit] = useState(reduce ? level : -1);

  useEffect(() => {
    if (reduce) {
      setLit(level);
      return;
    }
    setLit(-1);
    const timers = Array.from({ length: level + 1 }, (_, i) => setTimeout(() => setLit(i), 350 + i * 60));
    return () => timers.forEach(clearTimeout);
  }, [level, reduce, monthNo]);

  return (
    <div className="flex items-center gap-3 text-xs text-sub" data-testid="thermo">
      <span className="shrink-0">上月市场温度</span>
      <div className="flex flex-1 gap-1" role="img" aria-label={`上月大盘 ${pct(ret)}`}>
        {CELLS.map((c, i) => {
          const on = i <= lit;
          const target = i === level;
          return (
            <span
              key={c}
              className="h-3 flex-1 rounded-sm transition-opacity duration-150"
              style={{
                background: c,
                opacity: on ? (target ? 1 : 0.55) : 0.16,
                outline: target && on ? "1.5px solid var(--color-ink)" : "none",
                outlineOffset: 1,
                animation: target && lit === level && !reduce ? "pulse-once 400ms var(--ease-snap)" : undefined,
              }}
            />
          );
        })}
      </div>
      <span className="num shrink-0 text-ink">
        {monthNo}月大盘 {pct(ret)}
      </span>
    </div>
  );
}
