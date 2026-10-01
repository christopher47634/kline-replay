"use client";

import { Check, Play, X } from "lucide-react";
import type { SpecialEvent } from "@/game/persona";
import type { ReplayItem } from "@/game/replay";
import { TASKS, type TaskOutcome } from "@/game/tasks";
import type { TaskId } from "@/game/types";
import { pct, upDownColor } from "@/lib/format";
import { Emoji } from "@/components/ui/Emoji";
import type { Segment } from "@/music/compose";

const yuanDiff = (n: number) => `${n >= 0 ? "+" : "−"}¥${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
const pp = (n: number) => `${Math.abs(n * 100).toFixed(1)} 个百分点`;

/**
 * 结果页首屏：年度成绩 / 关键决定 / 播放片段 三件事并排，一屏兑现三个卖点。
 * 成绩、风格、特殊事件分开：强平是事件章，不吞掉年度成绩。
 */
export function FirstScreen({
  ret,
  marketRet,
  mdd,
  task,
  outcome,
  events,
  replay,
  segments,
  fullSecs,
  onHighlight,
  onFull,
  onTryTask,
}: {
  ret: number;
  marketRet: number;
  mdd: number;
  task: TaskId | null;
  outcome: TaskOutcome | null;
  events: SpecialEvent[];
  replay: ReplayItem[];
  segments: Segment[];
  fullSecs: number;
  onHighlight: () => void;
  onFull: () => void;
  onTryTask: (t: TaskId) => void;
}) {
  const beat = ret >= marketRet;
  const hlSecs = Math.round(segments.reduce((n, g) => n + g.end - g.start, 0) * 0.2);
  return (
    <section aria-label="本局概览" className="mt-6 grid gap-4 md:grid-cols-3" data-testid="first-screen">
      <div className="card-surface flex flex-col p-5">
        <p className="text-xs text-sub">本局成绩</p>
        <p className="mt-2 text-lg font-bold">
          <span className={beat ? "text-up" : "text-down"}>{beat ? "跑赢" : "跑输"}</span>满仓大盘 <span className="num">{pp(ret - marketRet)}</span>
        </p>
        <p className="mt-1 text-sm text-sub">
          全年最深回撤 <b className={`num ${upDownColor(mdd)}`}>{pct(mdd)}</b>
        </p>
        {task && outcome ? (
          <p className={`mt-3 flex items-start gap-2 rounded-lg border p-2.5 text-sm ${outcome.done ? "border-gold/60 bg-gold/10" : "border-line"}`} data-testid="task-outcome">
            <Emoji art={task === "guard" ? "shield" : "trophy"} char={task === "guard" ? "🛡️" : "🏆"} size={26} className="shrink-0" />
            <span>
              <b className={outcome.done ? "text-gold" : "text-sub"}>
                任务「{TASKS[task].name}」{outcome.done ? "完成" : "未完成"}
                {outcome.done ? <Check size={15} strokeWidth={2.6} aria-hidden className="ml-1 inline-block align-[-2px]" /> : <X size={15} strokeWidth={2.6} aria-hidden className="ml-1 inline-block align-[-2px]" />}
              </b>
              <span className="block text-xs text-sub">{outcome.legal ? outcome.line : "这条链接里有月份不符合任务规则，不计完成"}</span>
            </span>
          </p>
        ) : (
          <button type="button" onClick={() => onTryTask("guard")} className="press mt-3 rounded-lg border border-dashed border-line p-2.5 text-left text-sm text-sub hover:border-gold hover:text-ink">
            这局没选任务。同一年换个目标：<b className="text-ink">守住本金</b>（不亏、不加杠杆、不空仓）→
          </button>
        )}
        {events.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="特殊事件">
            {events.map((e) => (
              <li key={e.key} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${e.tone === "bad" ? "bg-up/12 text-up" : e.tone === "good" ? "bg-gold/15 text-gold" : "bg-line text-sub"}`}>
                {e.key === "liq" || e.key === "bust" ? <Emoji art="collision" char="💥" size={14} /> : null}
                {e.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-surface flex flex-col p-5">
        <p className="text-xs text-sub">关键决定</p>
        <ol className="mt-2 space-y-2.5">
          {replay.map((x) => (
            <li key={x.month} className="flex items-baseline gap-2 text-sm">
              <span className="num w-10 shrink-0 text-sub">{x.when}</span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1">
                  {x.choice ? `「${x.choice}」${x.edited ? "后改仓 · " : " · "}` : ""}风险仓位 {x.risky}%
                </span>
                {x.reason && <span className="block text-xs text-sub">理由：{x.reason}</span>}
              </span>
              <span className={`num shrink-0 font-bold ${upDownColor(x.pnl)}`}>{pct(x.pnl)}</span>
            </li>
          ))}
        </ol>
        <a
          href="#replay"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("replay")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="mt-auto pt-3 text-sm text-gold hover:underline"
        >
          看完整回放：当时看到什么、为什么、换条路会怎样 ↓
        </a>
      </div>

      <div className="card-surface flex flex-col p-5">
        <p className="text-xs text-sub">播放片段</p>
        <button type="button" onClick={onHighlight} className="press group mt-2 flex items-center gap-3 rounded-xl border border-up/40 bg-up/10 px-4 py-3 text-left hover:bg-up/15" data-testid="play-highlight">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-up text-white transition-transform group-hover:scale-105">
            <Play size={20} fill="currentColor" strokeWidth={0} className="translate-x-0.5" aria-hidden />
          </span>
          <span>
            <b className="block text-up">听 {hlSecs} 秒高光</b>
            <span className="text-xs text-sub">全年起伏最大的 {segments.length} 段，标出对应哪个决定</span>
          </span>
        </button>
        <ol className="mt-3 space-y-1 text-xs text-sub">
          {segments.map((g, k) => (
            <li key={g.start} className="line-clamp-1">
              <span className="num mr-1 text-up">{k + 1}</span>
              {g.label}
            </li>
          ))}
        </ol>
        <button type="button" onClick={onFull} className="mt-auto pt-3 text-left text-sm text-sub hover:text-ink">
          完整版约 {fullSecs} 秒 →
        </button>
      </div>
    </section>
  );
}

/** 三次关键决定回放（年终）：当时看到的事 → 你的理由 → 最终提交的仓位 → 真实结果 → 单步反事实。 */
export function DecisionReplay({ items }: { items: ReplayItem[] }) {
  if (!items.length) return null;
  return (
    <section id="replay" aria-label="关键决定回放" className="card-surface mt-6 scroll-mt-20 p-5 md:p-7" data-testid="decision-replay">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="shrink-0 font-bold">三次关键决定</h2>
        <span className="text-right text-xs text-sub">按你最终提交的仓位回放</span>
      </div>
      <ol className="mt-4 space-y-4">
        {items.map((x) => {
          const diff = x.gain - x.cf.gain;
          return (
            <li key={x.month} className="rounded-xl border border-line bg-bg p-4">
              <p className="flex items-center gap-2 text-sm">
                <b className="num">{x.when}</b>
                <span className="rounded-full bg-line px-2 py-0.5 text-[11px] text-sub">{x.kind === "moment" ? "历史时刻" : "全年最大调仓之一"}</span>
              </p>
              <div className="mt-3 grid gap-3 text-sm md:grid-cols-4">
                <Step k="当时看到">{x.saw}</Step>
                <Step k="你的理由">
                  {x.reason ?? <span className="text-sub">没留理由</span>}
                  {x.rumor && <span className="block text-xs text-sub">小道消息：{x.rumor === "trust" ? "更相信" : "没采信"}</span>}
                </Step>
                <Step k="最终提交">
                  {x.submitted}
                  {x.choice && (
                    <span className="block text-xs text-sub">
                      卡片上选了「{x.choice}」{x.edited ? "，之后又改了仓位——以最终提交为准" : ""}
                    </span>
                  )}
                </Step>
                <Step k="真实结果">
                  <span className={`num font-bold ${upDownColor(x.pnl)}`}>{pct(x.pnl)}</span>
                  <span className="num ml-1 text-xs text-sub">{yuanDiff(x.gain)}</span>
                  <span className="block text-xs text-sub">
                    大盘 <span className={`num ${upDownColor(x.market)}`}>{pct(x.market)}</span>
                  </span>
                </Step>
              </div>
              <p className="mt-3 border-t border-line pt-2.5 text-xs text-sub" data-testid="counterfactual">
                如果这个月{x.cf.label}：
                {x.cf.same ? (
                  "和你实际交的一样——这个月你没有动仓位。"
                ) : (
                  <>
                    当月 <span className={`num ${upDownColor(x.cf.pnl)}`}>{pct(x.cf.pnl)}</span>。你实际的选择比它
                    <b className={`num mx-0.5 ${upDownColor(diff)}`}>{diff >= 0 ? "多赚" : "少赚"} ¥{Math.round(Math.abs(diff)).toLocaleString("en-US")}</b>
                    {Math.abs(diff) < 1 ? "，几乎一样。" : diff > 0 ? "——这一步调对了。" : "——这一步调仓付出了代价。"}
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-sub">单步反事实：只把那一个月换成上个月的仓位，其他月份不变，也不重新预测之后的人生；它不是事后最优，只是另一条现成的路。</p>
    </section>
  );
}

function Step({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-sub">{k}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
