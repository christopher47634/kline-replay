"use client";

import { AnimatePresence, m as motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BlindReveal } from "./BlindReveal";
import { celebrate } from "@/lib/celebrate";
import { MagneticButton } from "@/components/motion/Magnetic";
import { Odometer } from "@/components/motion/Odometer";
import { useMotionPref } from "@/components/shell/MotionPref";
import { btn } from "@/components/ui/Button";
import { decodeGame } from "@/game/encode";
import { benchmarks, everLiquidated, isBusted, playAll, rank as rankOf, simulateDaily, totalReturn } from "@/game/engine";
import { judgePersona, keyMoves, pickQuote, PERSONAS, specialEvents, styleEvidence } from "@/game/persona";
import { gameStore } from "@/game/store";
import type { Allocation, Script, TaskId } from "@/game/types";
import { decodeNotes } from "@/game/notes";
import { decisionReplay } from "@/game/replay";
import { isTask, maxDrawdown, TASKS, TASK_IDS, taskOutcome } from "@/game/tasks";
import { challengeHref } from "@/game/link";
import { highlightSegments } from "@/music/compose";
import { nextMystery } from "@/lib/blind";
import { FirstScreen, DecisionReplay } from "./Overview";
import { themeTone, pct, pp, upDownColor } from "@/lib/format";
import { haptic, play } from "@/lib/sfx";
import { copyText, exportPng, shareText } from "@/lib/share";
import { BlockGrid } from "./BlockGrid";
import { BoardSubmit } from "./BoardSubmit";
import { YearVoice } from "./YearVoice";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";

const MusicModal = dynamic(() => import("./MusicModal").then((m) => m.MusicModal), { ssr: false });
import { PersonaCard, PersonaPoster } from "./PersonaCard";
import { Check } from "lucide-react";
import { Emoji } from "@/components/ui/Emoji";
const ReturnChart = dynamic(() => import("./ReturnChart").then((m) => m.ReturnChart), { ssr: false, loading: () => <ChartSkeleton height={320} /> });

const signedPct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`;

/** `script` is looked up on the server from the code, so only that year's data reaches the browser. */
export function ResultView({
  code,
  script,
  boardOn,
  openMusic = false,
  blind = false,
  years = [],
  task: taskParam,
  notes: notesParam,
}: {
  code: string;
  script: Script | null;
  boardOn: boolean;
  openMusic?: boolean;
  /** straight after a 盲盒 game: ask which year it was before showing anything that names it */
  blind?: boolean;
  years?: string[];
  /** t= : the task card the game was played under */
  task?: string;
  /** n= : optional reasons and rumour stances (game/notes.ts) */
  notes?: string;
}) {
  const decoded = useMemo(() => decodeGame(code), [code]);
  const [wasBlind] = useState(blind);
  const task = isTask(taskParam) ? taskParam : null;
  // the link without blind=1, keeping t= and n=
  const plain = `s=${encodeURIComponent(code)}${task ? `&t=${task}` : ""}${notesParam ? `&n=${encodeURIComponent(notesParam)}` : ""}`;
  const [revealed, setRevealed] = useState(!blind);
  if (!decoded.ok || !script || script.id !== decoded.scriptId) return <InvalidLink reason={decoded.ok ? "剧本不存在" : decoded.error} />;
  if (!revealed)
    return (
      <BlindReveal
        years={years}
        answer={script.id}
        title={script.title}
        subtitle={script.subtitle}
        ret={totalReturn(script, playAll(script, decoded.allocs))}
        onDone={() => {
          setRevealed(true);
          window.history.replaceState(null, "", `/result?${plain}`); // a reload or a shared link shows the result directly
          window.scrollTo(0, 0);
        }}
      />
    );
  return <Result query={plain} script={script} allocs={decoded.allocs} boardOn={boardOn} openMusic={openMusic} task={task} notesParam={notesParam} wasBlind={wasBlind} years={years} code={code} />;
}

/** A share button that turns green with a ✓ for 0.8s after it succeeds. */
function ShareButton({ variant, label, run, onDone }: { variant: "primary" | "outline"; label: string; run: () => Promise<string | null>; onDone: (msg: string) => void }) {
  const [ok, setOk] = useState(false);
  return (
    <MagneticButton
      className={`${btn(variant)} ${ok ? "!bg-down !text-white !border-down" : ""}`}
      onClick={async () => {
        const msg = await run();
        if (msg) {
          onDone(msg);
          setOk(true);
          setTimeout(() => setOk(false), 800);
        } else onDone("复制失败");
      }}
    >
      {ok ? (
        <span className="inline-flex items-center gap-1">
          <Check size={16} strokeWidth={2.4} aria-hidden />
          已完成
        </span>
      ) : (
        label
      )}
    </MagneticButton>
  );
}

/** Four bars that bounce like an equaliser; faster on hover (driven by the group-hover class). */
function Equaliser() {
  return (
    <span aria-hidden className="eq ml-auto flex h-6 items-end gap-[3px]">
      {[0, 1, 2, 3].map((i) => (
        <i key={i} className="w-[3px] rounded-sm bg-up" style={{ animationDelay: `${i * 0.13}s` }} />
      ))}
    </span>
  );
}

function Result({
  code,
  query,
  script,
  allocs,
  boardOn,
  openMusic,
  task,
  notesParam,
  wasBlind,
  years,
}: {
  code: string;
  query: string;
  script: Script;
  allocs: Allocation[];
  boardOn: boolean;
  openMusic: boolean;
  task: TaskId | null;
  notesParam?: string;
  wasBlind: boolean;
  years: string[];
}) {
  const router = useRouter();
  const { reduce } = useMotionPref();
  const poster = useRef<HTMLDivElement>(null);
  const [music, setMusic] = useState<null | "full" | "highlight">(openMusic ? "full" : null);
  const [toast, setToast] = useState<string | null>(null);
  const [stamped, setStamped] = useState(reduce);
  const [flyer, setFlyer] = useState<{ x: number; y: number } | null>(null);

  // Everything is recomputed from the URL: nothing else is trusted.
  const r = useMemo(() => {
    const history = playAll(script, allocs);
    const ret = totalReturn(script, history);
    const liquidated = everLiquidated(history);
    const personaId = judgePersona(history, script);
    const b = benchmarks(script, history);
    const marketRet = b.market[12] / script.startCash - 1;
    const cashRet = b.cash[12] / script.startCash - 1;
    const daily = simulateDaily(history, script);
    const busted = isBusted(history);
    return {
      history,
      ret,
      liquidated,
      busted,
      // 成绩只看收益；强平没把账户打穿就只是一枚特殊事件章
      rank: rankOf(ret, busted),
      personaId,
      persona: PERSONAS[personaId],
      quote: pickQuote(personaId, history),
      moves: keyMoves(history, script),
      b,
      marketRet,
      cashRet,
      daily,
      mdd: maxDrawdown(daily, script.startCash),
      outcome: task ? taskOutcome(task, script, history) : null,
      replay: decisionReplay(script, history, decodeNotes(notesParam)),
      evidence: styleEvidence(history, script, Object.fromEntries(script.assets.map((a) => [a.id, a.name.replace(/ ETF$|板块$/, "")]))),
      events: specialEvents(history, script),
      segments: highlightSegments(daily, history, (m) => script.months[m].label.replace(/^\d+ 年 /, "")),
    };
  }, [script, allocs, task, notesParam]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const [origin, setOrigin] = useState(process.env.NEXT_PUBLIC_SITE_URL ?? "");
  const [mounted, setMounted] = useState(false); // the music modal portals to document.body: client only
  useEffect(() => {
    setOrigin(window.location.origin);
    setMounted(true);
  }, []);
  const link = `${origin}/result?${query}`;
  const challenge = `${origin}${challengeHref(script.id, task)}`;
  const challengeText = `我在穿越 K 线的 ${script.id}${task ? `「${TASKS[task].name}」挑战` : ""}里${r.ret >= 0 ? "赚了" : "亏了"} ${pct(r.ret).replace(/^[+−-]/, "")}${r.outcome ? (r.outcome.done ? "，任务完成" : "，任务没完成") : ""}。同一年、同样的消息，你来试试：${challenge}`;
  const text = shareText({ script, history: r.history, ret: r.ret, rankLabel: r.rank.label, personaTitle: r.persona.title, quote: r.quote, origin });

  const savePoster = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!poster.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    try {
      await exportPng(poster.current, `穿越K线-${script.id}-${r.persona.title}.png`, 1080, 1350);
      flash("人格卡已保存");
      play("ding", 0.5);
      if (!reduce) {
        setFlyer({ x: rect.left + rect.width / 2, y: rect.top });
        setTimeout(() => setFlyer(null), 900);
      }
    } catch {
      flash("保存失败，可以直接截图");
    }
  };

  // a new game of this year (optionally under a task card): reset the save, then open the intro with the card picked
  const again = (t: TaskId | null = task) => {
    gameStore(script).getState().reset();
    router.push(challengeHref(script.id, t));
  };

  const cmp = (label: string, other: number) => (
    <li>
      <span className={r.ret >= other ? "text-up" : "text-down"}>{r.ret >= other ? "跑赢" : "跑输"}</span>
      {label}
      <span className={`num mx-1 font-bold ${r.ret >= other ? "text-up" : "text-down"}`} data-zoom data-zoom-value={`${pp(r.ret, other)} pp`} data-zoom-label={`${r.ret >= other ? "跑赢" : "跑输"}${label}`} data-zoom-tone={r.ret >= other ? "up" : "down"}>
        <Odometer value={Math.abs(r.ret - other) * 100} format={(n) => n.toFixed(1)} duration={800} />
      </span>
      个百分点
      <span className="sr-only">{pp(r.ret, other)}</span>
    </li>
  );

  return (
    <main className="mx-auto max-w-[1120px] px-4 py-10 md:px-6 md:py-14" data-zoom-area>
      {/* black-out: the page arrives from darkness (0.2s) */}
      {!reduce && <motion.div aria-hidden initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.2, delay: 0.05 }} className="pointer-events-none fixed inset-0 z-[55] bg-bg" />}

      <p className="text-sm text-sub">{script.title}</p>
      <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-3">
        <h1 className="font-display text-h1 tracking-tight">
          你的 {script.id}：
          <span className={`num ${upDownColor(r.ret)}`}>
            {/* the wheel is decorative; the real text lives in the sr-only element (tests and screen readers read it) */}
            <span aria-hidden>
              <Odometer
                testId="final-return-odometer"
                value={r.ret * 100}
                format={signedPct}
                duration={1400}
                onDone={() => {
                  setStamped(true);
                  // beat the market over the year: confetti from both sides, once
                  if (r.ret > r.marketRet && !r.busted) void celebrate("year");
                }}
              />
            </span>
            <span data-testid="final-return" className="sr-only">
              {pct(r.ret)}
            </span>
          </span>
        </h1>
        <motion.span
          className="rank-stamp mb-1 rounded-full border-2 px-4 py-1 text-base font-bold md:mb-2"
          style={{ borderColor: themeTone(r.rank.color), color: themeTone(r.rank.color) }}
          initial={reduce ? false : { opacity: 0, scale: 1.3, rotate: 8, x: 40 }}
          animate={stamped ? { opacity: 1, scale: 1, rotate: 0, x: 0 } : undefined}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          onAnimationStart={() => {
            if (stamped && !reduce) {
              play("tick");
              haptic("stamp");
            }
          }}
        >
          {r.rank.label}
        </motion.span>
      </div>
      {r.busted && <p className="mt-3 font-medium text-up">爆仓结局：第 {r.history.length} 个月账户归零，游戏提前结束。</p>}

      <FirstScreen
        ret={r.ret}
        marketRet={r.marketRet}
        mdd={r.mdd}
        task={task}
        outcome={r.outcome}
        events={r.events}
        replay={r.replay}
        segments={r.segments}
        fullSecs={Math.round(r.daily.length * 0.2)}
        onHighlight={() => setMusic("highlight")}
        onFull={() => setMusic("full")}
        onTryTask={(t) => again(t)}
      />

      <section aria-label="收益对比" className="card-surface mt-8 p-4 md:p-6">
        <ReturnChart b={r.b} startCash={script.startCash} history={r.history} />
        <ul className="mt-4 grid gap-1.5 text-sm md:grid-cols-3 md:text-base">
          {cmp("满仓大盘", r.marketRet)}
          {cmp("全程现金", r.cashRet)}
          {cmp("散户平均", r.b.retailAvg)}
        </ul>
        <p className="mt-3 text-xs text-sub">散户平均：{script.benchmarks.retailAvgNote}</p>
      </section>

      <YearVoice script={script} history={r.history} daily={r.daily} marketRet={r.marketRet} cashRet={r.cashRet} />

      <DecisionReplay items={r.replay} />

      <div className="mt-6 grid items-stretch gap-6 md:grid-cols-[1.4fr_1fr]">
        <PersonaCard persona={r.persona} quote={r.quote} moves={r.moves} evidence={r.evidence} />
        <section aria-label="每月结果" className="card-surface flex flex-col p-5 md:p-7">
          <p className="text-sm text-sub">12 个月，一月一格</p>
          <div className="mt-4">
            <BlockGrid script={script} history={r.history} />
          </div>
          <p className="mt-3 text-xs text-sub">
            <span className="text-up">■</span> 赚 <span className="ml-2 text-down">■</span> 亏 <span className="ml-2 text-[#A855F7]">■</span> 强平
          </p>
          <button type="button" onClick={() => setMusic("full")} className="group mt-auto pt-6 text-left">
            <span className="flex items-center gap-3 rounded-xl border border-up/40 bg-up/10 px-4 py-4 transition-colors group-hover:bg-up/15">
              <Emoji art="headphone" char="🎧" size={36} className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
              <span>
                <span className="block font-bold text-up">听听你的 {script.id}</span>
                <span className="mt-0.5 block text-xs text-sub">资产曲线和大盘的二重奏，约 {Math.round(r.daily.length * 0.2)} 秒</span>
              </span>
              <Equaliser />
            </span>
          </button>
        </section>
      </div>

      <section aria-label="分享" className="mt-6 flex flex-wrap gap-2">
        <ShareButton variant="primary" label="复制结果文本" run={async () => ((await copyText(text)) ? "结果文本已复制" : null)} onDone={flash} />
        <ShareButton variant="outline" label="复制链接" run={async () => ((await copyText(link)) ? "链接已复制" : null)} onDone={flash} />
        <MagneticButton className={btn("outline")} onClick={(e) => void savePoster(e as unknown as React.MouseEvent<HTMLButtonElement>)}>
          保存人格卡
        </MagneticButton>
        <ShareButton variant="outline" label="复制挑战链接" run={async () => ((await copyText(challengeText)) ? "挑战链接已复制：对方打开就是同一年、同一个目标" : null)} onDone={flash} />
        {wasBlind ? (
          <>
            <MagneticButton className={btn("outline")} onClick={() => router.push(nextMystery(years, script.id))}>
              再开一个盲盒
            </MagneticButton>
            <MagneticButton className={btn("outline")} onClick={() => again(null)}>
              复盘本年（公开年份）
            </MagneticButton>
          </>
        ) : (
          <>
            <MagneticButton className={btn("outline")} onClick={() => again()}>
              {task ? `再挑战一次「${TASKS[task].name}」` : "再来一局"}
            </MagneticButton>
            {TASK_IDS.filter((t) => t !== task).map((t) => (
              <MagneticButton key={t} className={btn("outline")} onClick={() => again(t)}>
                同一年换个目标：{TASKS[t].name}
              </MagneticButton>
            ))}
          </>
        )}
        <Link href="/" className={btn("ghost")}>
          换个年份
        </Link>
        <Link href="/events" className={btn("ghost")}>
          去猜大事件
        </Link>
      </section>

      {boardOn && <BoardSubmit code={code} ret={r.ret} scriptId={script.id} />}

      <details className="mt-8 text-sm text-sub">
        <summary className="cursor-pointer hover:text-ink">分享文本预览</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-line bg-card p-3 font-sans text-ink">{text}</pre>
      </details>

      {/* off-screen poster for PNG export */}
      <div aria-hidden style={{ position: "fixed", left: -99999, top: 0 }}>
        <div ref={poster}>
          <PersonaPoster
            persona={r.persona}
            quote={r.quote}
            moves={r.moves}
            ret={r.ret}
            rank={r.rank}
            title={script.title}
            blocks={r.history.map((h) => (h.liquidated ? "#A855F7" : h.pnl >= 0 ? "#bc3e49" : "#277454"))}
            diffVsMarket={r.ret - r.marketRet}
          />
        </div>
      </div>

      {music && mounted && (
        <MusicModal
          script={script}
          daily={r.daily}
          history={r.history}
          onClose={() => setMusic(null)}
          bigPlay={openMusic}
          highlight={music === "highlight" ? r.segments : undefined}
          onCopyLink={async () => flash((await copyText(`${link}&play=1`)) ? "音乐链接已复制" : "复制失败")}
        />
      )}

      {/* the saved card flies from its button to the bottom-right corner and disappears */}
      <AnimatePresence>
        {flyer && (
          <motion.div
            aria-hidden
            initial={{ x: flyer.x - 30, y: flyer.y - 38, scale: 1, opacity: 1 }}
            animate={{ x: window.innerWidth - 80, y: window.innerHeight - 100, scale: 0.35, opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
            className="pointer-events-none fixed left-0 top-0 z-[80] h-[76px] w-[60px] rounded-md border border-line"
            style={{ background: `linear-gradient(160deg, ${r.persona.color}66, var(--color-bg))` }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2 text-sm font-medium text-bg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function InvalidLink({ reason }: { reason: string }) {
  return (
    <main className="mx-auto max-w-[680px] px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">链接无效</h1>
      <p className="mt-3 text-sub">这个结果链接没法还原（{reason}）。可能是复制时被截断了。</p>
      <Link href="/" className={btn("primary", "mt-8")}>
        回首页
      </Link>
    </main>
  );
}
