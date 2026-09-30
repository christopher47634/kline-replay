"use client";

import { m as motion, useAnimationControls } from "motion/react";
import { useEffect, useState } from "react";
import { useMotionPref } from "@/components/shell/MotionPref";
import type { Script } from "@/game/types";
import { play } from "@/lib/sfx";

const RULES = [
  <>
    起始资金 <span className="num font-bold">¥ 100,000</span>，共 12 回合，每回合 1 个月
  </>,
  "每月的涨跌来自真实历史行情，头条基于当月初已发生的真实事件",
  "小道消息一半是信号、一半是噪音，自己判断",
];

/**
 * The one light page: an old archive card on paper. Teletype intro (a tiny jitter on each new character, a soft tick
 * every third one, square blinking cursor); click the text to skip. "开始" flips the page (rotateY, origin left) into the dark game.
 */
export function Intro({ script, onStart }: { script: Script; onStart: () => void }) {
  const { reduce } = useMotionPref();
  const [n, setN] = useState(0);
  const full = script.intro;
  const flip = useAnimationControls();
  const done = n >= full.length;

  useEffect(() => {
    if (reduce) {
      setN(full.length);
      return;
    }
    if (done) return;
    const t = setTimeout(() => {
      setN((v) => v + 1);
      if ((n + 1) % 3 === 0) play("tick", 0.35);
    }, 34);
    return () => clearTimeout(t);
  }, [n, done, full.length, reduce]);

  const start = async () => {
    play("flip");
    if (!reduce) await flip.start({ rotateY: -90, transition: { duration: 0.32, ease: [0.65, 0, 0.35, 1] } });
    onStart();
  };

  return (
    <div style={{ perspective: 1600 }} className="overflow-hidden">
      <motion.main animate={flip} style={{ transformOrigin: "left center" }} className="paper-surface relative min-h-[100svh] overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgb(60 40 10 / 0.28) 100%)" }} />
        {/* archive stamp */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: reduce ? 1 : 1.5, rotate: -8 }}
          animate={{ opacity: 0.8, scale: 1, rotate: -8 }}
          transition={{ delay: reduce ? 0 : 0.5, type: "spring", stiffness: 260, damping: 22 }}
          className="absolute right-6 top-8 rounded-md border-[3px] border-[#B3261E] px-3 py-1 text-center text-[#B3261E] md:right-16 md:top-14"
          style={{ boxShadow: "inset 0 0 0 2px rgb(179 38 30 / 0.35)" }}
        >
          <p className="text-[10px] tracking-[0.3em]">档案编号</p>
          <p className="num text-xl font-black tracking-widest">{script.blind ? "????" : script.id}-01</p>
        </motion.div>

        <div className="relative mx-auto max-w-[720px] px-6 py-20 md:py-28">
          <p className="text-sm font-bold text-[#8A5A00]">{script.subtitle}</p>
          <h1 className="font-display text-h1 mt-2" style={{ viewTransitionName: "script-card" } as React.CSSProperties}>
            {script.title}
          </h1>

          <p className="mt-8 min-h-[9.5rem] cursor-pointer text-lg leading-loose" onClick={() => setN(full.length)} aria-label={full}>
            <span aria-hidden>
              {full.slice(0, Math.max(0, n - 1))}
              {n > 0 && (
                <span key={n} className={done ? "" : "teletype-char"}>
                  {full[n - 1]}
                </span>
              )}
              {!done && <span className="ml-0.5 inline-block h-5 w-2.5 animate-pulse bg-[#2A2622] align-middle" />}
            </span>
          </p>

          <ul className="mt-8 space-y-2 text-sm text-[#5b5142]">
            {RULES.map((r, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: reduce ? 0 : -24 }} animate={{ opacity: done ? 1 : 0, x: done ? 0 : reduce ? 0 : -24 }} transition={{ delay: done ? i * 0.12 : 0, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                · {r}
              </motion.li>
            ))}
          </ul>

          <button
            type="button"
            onClick={start}
            autoFocus
            className="mt-10 h-14 rounded-lg bg-[#1a1712] px-10 text-base font-bold text-[#f2ead6] transition-transform duration-100 hover:bg-black active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B3261E]"
          >
            开始第 1 回合 →
          </button>
        </div>
      </motion.main>
    </div>
  );
}
