"use client";

import { m as motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BoardCount } from "@/components/home/BoardCount";
import { DrawPath } from "@/components/motion/DrawPath";
import { TiltCard } from "@/components/motion/TiltCard";
import { useMotionPref } from "@/components/shell/MotionPref";
import { navigateWithTransition } from "@/lib/viewTransition";
import spark from "@/components/hero/spark.json";

const SCRIPTS = [
  { id: "2015", title: "2015：疯牛与股灾", note: "沪指 3200 → 5178 → 2850", stars: 4, minutes: 6, open: true },
  { id: "2020", title: "2020：疫情与核心资产", note: "黑天鹅、零利率、抱团白酒", stars: 3, minutes: 6, open: true },
  { id: "2007", title: "2007：大牛市", note: "敬请期待", stars: 0, minutes: 0, open: false },
];

function sparkPath(id: string) {
  const v = (spark as Record<string, number[]>)[id];
  if (!v) return "";
  return v.map((y, i) => `${i ? "L" : "M"}${((i / (v.length - 1)) * 300).toFixed(1)} ${(100 - y * 80 - 10).toFixed(1)}`).join(" ");
}

export function ScriptCards({ board }: { board: boolean }) {
  const router = useRouter();
  const { reduce, touch } = useMotionPref();
  const [hover, setHover] = useState<string | null>(null);
  const [tip, setTip] = useState(false);

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-3">
      {SCRIPTS.map((s, i) => {
        const body = (
          <>
            {s.open && (
              <svg aria-hidden viewBox="0 0 300 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 w-full opacity-70">
                {hover === s.id && !reduce && <DrawPath d={sparkPath(s.id)} stroke="#FF4D4F" strokeWidth={2} duration={0.6} glow />}
                {reduce && <path d={sparkPath(s.id)} fill="none" stroke="#FF4D4F" strokeWidth={2} opacity={0.4} />}
              </svg>
            )}
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="num text-5xl font-black text-ink/90">{s.id}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${s.open ? "bg-up/15 text-up" : "bg-line text-sub"}`}>{s.open ? "可玩" : "敬请期待"}</span>
              </div>
              <p className="mt-4 font-display text-2xl">{s.title}</p>
              <p className="mt-1 text-sm text-sub">{s.note}</p>
              {s.open ? (
                <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-sub">
                  <span>
                    难度 <span className="text-gold">{"★".repeat(s.stars)}</span>
                    <span className="text-line">{"★".repeat(5 - s.stars)}</span>
                  </span>
                  <span>约 {s.minutes} 分钟</span>
                  {board && <BoardCount scriptId={s.id} />}
                </p>
              ) : (
                <p className="mt-4 h-4 text-xs text-gold/80">{tip ? "投票想先出哪一年（还没做，但你的心意收到了）" : ""}</p>
              )}
            </div>
          </>
        );
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: reduce ? 0 : 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            transition={{ duration: 0.32, delay: reduce ? 0 : i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
          >
            <TiltCard className="h-full">
              {s.open ? (
                <a
                  href={`/play/${s.id}`}
                  data-script-card={s.id}
                  onPointerEnter={() => setHover(s.id)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(s.id)}
                  onBlur={() => setHover(null)}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).style.viewTransitionName = "script-card";
                    navigateWithTransition(router, `/play/${s.id}`, { skip: reduce || touch });
                  }}
                  className="card-surface relative block h-full overflow-hidden p-6 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-gold/60 focus-visible:outline-2 focus-visible:outline-gold"
                >
                  {body}
                </a>
              ) : (
                <motion.div
                  onHoverStart={() => setTip(true)}
                  onHoverEnd={() => setTip(false)}
                  whileHover={reduce ? undefined : { x: [0, -3, 3, -2, 2, 0], transition: { duration: 0.4 } }}
                  className="relative h-full rounded-2xl border border-dashed border-line p-6 opacity-60"
                >
                  {body}
                </motion.div>
              )}
            </TiltCard>
          </motion.div>
        );
      })}
    </div>
  );
}
