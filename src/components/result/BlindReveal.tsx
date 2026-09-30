"use client";

import { m as motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Emoji } from "@/components/ui/Emoji";
import { useMotionPref } from "@/components/shell/MotionPref";
import { celebrate } from "@/lib/celebrate";
import { haptic, play } from "@/lib/sfx";

/**
 * 盲盒模式的揭晓：先让玩家猜这 12 个月是哪一年，再翻出答案（年份、标题、一句话），然后进入平常的结算页。
 * The result link itself carries the real year, so this step only exists right after a blind game (?blind=1).
 */
export function BlindReveal({ years, answer, title, subtitle, ret, onDone }: { years: string[]; answer: string; title: string; subtitle: string; ret: number; onDone: () => void }) {
  const { reduce } = useMotionPref();
  const [guess, setGuess] = useState<string | null>(null);
  const right = guess === answer;
  const pick = (y: string) => {
    if (guess) return;
    setGuess(y);
    if (y === answer) {
      play("up");
      haptic("settle");
      void celebrate("year");
    } else play("down");
  };
  return (
    <main className="mx-auto grid min-h-[80dvh] max-w-[720px] place-items-center px-4 py-16" data-testid="blind-reveal">
      <div className="card-surface w-full p-6 text-center md:p-10">
        <Emoji art="question" char="❓" size={72} className={`mx-auto ${guess ? "" : "mystery-float"}`} />
        <p className="mt-4 text-sm text-sub">盲盒揭晓 · 这一年你的收益 {ret >= 0 ? "+" : "−"}{Math.abs(ret * 100).toFixed(1)}%</p>
        <h1 className="mt-2 font-display text-h2">你刚才玩的是哪一年？</h1>
        <div className="mt-6 grid grid-cols-3 gap-3" role="group" aria-label="猜年份">
          {years.map((y) => {
            const state = !guess ? "" : y === answer ? "border-up text-up" : y === guess ? "border-down text-down line-through" : "opacity-40";
            return (
              <button
                key={y}
                type="button"
                onClick={() => pick(y)}
                disabled={!!guess}
                className={`press num h-14 rounded-xl border border-line text-xl font-black transition-colors hover:border-gold disabled:cursor-default ${state}`}
                data-testid={`guess-${y}`}
              >
                {y}
              </button>
            );
          })}
        </div>
        {guess && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12, rotateX: 60 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className="mt-8"
            data-testid="blind-answer"
          >
            <p className={`text-lg font-bold ${right ? "text-up" : "text-sub"}`}>{right ? "猜对了！" : `没猜中，你选的是 ${guess}`}</p>
            <p className="mt-2 font-display text-h2">{title}</p>
            <p className="mt-1 text-sub">{subtitle}</p>
            <Button className="shine relative mt-6 h-12 px-8 text-base" onClick={onDone}>
              看这一年的结算 →
            </Button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
