"use client";

import { m as motion, useAnimationControls } from "motion/react";
import { useEffect, useState } from "react";
import { useMotionPref } from "@/components/shell/MotionPref";
import type { Script, TaskId } from "@/game/types";
import { TASKS, TASK_IDS } from "@/game/tasks";
import { play } from "@/lib/sfx";

const RULES = [
  <>
    起始资金 <span className="num font-bold">¥ 100,000</span>，共 12 回合，每回合 1 个月
  </>,
  "每月的涨跌来自真实历史行情，头条基于当月初已发生的真实事件",
  "小道消息有真有假，没有固定规律；信不信由你，月底会告诉你它成没成真",
];

/**
 * A theme-aware archive card. Teletype intro (a tiny jitter on each new character, a soft tick
 * every third one, square blinking cursor); click the text to skip. "开始" flips the page (rotateY, origin left) into the dark game.
 */
export function Intro({ script, onStart, initialTask = null }: { script: Script; onStart: (task: TaskId | null) => void; initialTask?: TaskId | null }) {
  const [task, setTask] = useState<TaskId | null>(initialTask);
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
    onStart(task);
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
          className="absolute right-6 top-28 rounded-md border-[3px] archive-stamp px-3 py-1 text-center archive-accent md:right-16 md:top-14"
        >
          <p className="text-[10px] tracking-[0.3em]">档案编号</p>
          <p className="num text-xl font-black tracking-widest">{script.blind ? "????" : script.id}-01</p>
        </motion.div>

        <div className="relative mx-auto max-w-[720px] px-6 pb-20 pt-48 md:py-28">
          <p className="text-sm font-bold archive-accent">{script.subtitle}</p>
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
              {!done && <span className="ml-0.5 inline-block h-5 w-2.5 animate-pulse archive-cursor align-middle" />}
            </span>
          </p>

          <ul className="mt-8 space-y-2 text-sm archive-muted">
            {RULES.map((r, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: reduce ? 0 : -24 }} animate={{ opacity: done ? 1 : 0, x: done ? 0 : reduce ? 0 : -24 }} transition={{ delay: done ? i * 0.12 : 0, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                · {r}
              </motion.li>
            ))}
          </ul>

          {/* 任务卡：历史不变，目标变；可跳过 */}
          <motion.fieldset
            initial={{ opacity: 0, y: reduce ? 0 : 12 }}
            animate={{ opacity: done ? 1 : 0, y: done ? 0 : reduce ? 0 : 12 }}
            transition={{ delay: done ? 0.4 : 0, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9"
            data-testid="task-picker"
          >
            <legend className="text-sm font-bold archive-copy">
              这一局的目标 <span className="font-normal archive-muted">· 可选，同一年换个目标再玩一遍</span>
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="这一局的目标">
              {[null, ...TASK_IDS].map((id) => {
                const t = id ? TASKS[id] : null;
                const on = task === id;
                return (
                  <button
                    key={id ?? "free"}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setTask(id)}
                    className="archive-option press rounded-lg border-2 p-3 text-left transition-colors"
                  >
                    <b className="block text-[15px]">{t ? t.name : "自由玩"}</b>
                    <span className="archive-muted mt-1 block text-xs leading-relaxed">
                      {t ? (
                        <>
                          目标：{t.goal}
                          {t.rules.map((r) => (
                            <span key={r} className="block">
                              规则：{r}
                            </span>
                          ))}
                        </>
                      ) : (
                        "没有限制，能赚多少赚多少"
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.fieldset>

          <button
            type="button"
            onClick={start}
            className="mt-8 h-14 rounded-lg archive-action px-10 text-base font-bold transition-transform duration-100 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            开始第 1 回合{task ? `（${TASKS[task].name}）` : ""} →
          </button>
        </div>
      </motion.main>
    </div>
  );
}
