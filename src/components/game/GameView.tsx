"use client";

import { m as motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { btn, Button } from "@/components/ui/Button";
import { resultHref as buildResultHref } from "@/game/link";
import { gameStore } from "@/game/store";
import { isTask, TASKS, taskViolation } from "@/game/tasks";
import type { MonthNote, Script, TaskId } from "@/game/types";
import { AllocationPanel, isValidAlloc, type AllocationPanelHandle } from "./AllocationPanel";
import { allocSum } from "@/game/engine";
import { HeadlineCard, RumorCard } from "./HeadlineCard";
import { Intro } from "./Intro";
import { MagneticButton } from "@/components/motion/Magnetic";
import { BustVignette, runBustFx } from "./BustFx";
import { Enter } from "@/components/motion/Enter";
import { useMotionPref } from "@/components/shell/MotionPref";
import { MomentCard } from "./MomentCard";
import { applyEffect, type MomentOption } from "@/game/moment";
import { KnownInfo } from "./KnownInfo";
import { setPrefs, useResolved } from "@/lib/prefs";
import { SettleDialog } from "./SettleDialog";
import { StatusBar } from "./StatusBar";
import { Thermometer } from "./Thermometer";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";

// recharts stays out of the first-load bundle; the skeleton holds the space so nothing shifts
// the workbench and the macro drawer (with their data) load after the board is interactive
const Workbench = dynamic(() => import("./Macro").then((m) => m.Workbench), { ssr: false });
const TrendChart = dynamic(() => import("./TrendChart").then((m) => m.TrendChart), { ssr: false, loading: () => <ChartSkeleton height={340} /> });
import { tick } from "@/lib/sfx";

/** Starting opacity for the columns that re-enter when the month turns (see the Enter comment). */
const TURN_FROM = 0.6;

export function GameView({ script }: { script: Script }) {
  const useGame = useMemo(() => gameStore(script), [script]);
  const st = useGame();
  const [hydrated, setHydrated] = useState(false);
  const { reduce } = useMotionPref();
  const { density, autofill } = useResolved();
  // a challenge link (/play/2015?t=guard) pre-selects the task card on the intro page
  const [linkTask, setLinkTask] = useState<TaskId | null>(null);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    if (isTask(t)) setLinkTask(t);
  }, []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [flipIn, setFlipIn] = useState(false); // came from the paper Intro: the game page flips in from the other side
  const panel = useRef<AllocationPanelHandle>(null);

  // Warm the text-reveal library while the player reads round 1, so the first settle dialog does not pay for parsing it.
  useEffect(() => {
    const warm = () => void Promise.all([import("gsap"), import("gsap/SplitText"), import("gsap/ScrollTrigger")]);
    const id = setTimeout(warm, 1500);
    return () => clearTimeout(id);
  }, []);
  const router = useRouter();

  useEffect(() => {
    setHydrated(useGame.persist.hasHydrated());
    return useGame.persist.onFinishHydration(() => setHydrated(true));
  }, [useGame]);

  // Historical-moment card: shown once per round, before the allocation panel. The answer lives in the game's own
  // notes, so it resets with the game (a new game shows the cards again) and survives reloads.
  const seen = (m: number) => st.notes[m]?.moment !== undefined;
  const rule = taskViolation(st.task, st.draft);
  const valid = isValidAlloc(st.draft) && !rule;
  // 盲盒: the result page first asks which year it was, then reveals it
  const resultHref = buildResultHref(script.id, st.history, { task: st.task, notes: st.notes, blind: script.blind });

  // Next month: the button says "结算中…" for ~0.5 s, then the page turns to the new month (status flip, chart segment)
  // and only then does the settle dialog rise from the button. A liquidation plays its full screen effect first.
  const [settling, setSettling] = useState(false);
  const [chartLen, setChartLen] = useState<number | null>(null);
  const [bustRun, setBustRun] = useState(0);
  const shakeRef = useRef<HTMLDivElement>(null);
  const goNext = () => {
    if (!valid || dialogOpen || st.finished || settling) return;
    tick();
    if (reduce) {
      setChartLen(st.history.length);
      st.next();
      if (useGame.getState().last?.liquidated) runBustFx(null); // sound and buzz only
      setDialogOpen(true);
      return;
    }
    setSettling(true);
    setChartLen(st.history.length);
    setTimeout(() => {
      st.next();
      setSettling(false);
      const bust = useGame.getState().last?.liquidated;
      if (bust) {
        runBustFx(shakeRef.current);
        setBustRun((n) => n + 1);
      }
      setTimeout(() => setDialogOpen(true), bust ? 700 : 480);
    }, 520);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    if (useGame.getState().finished) router.push(resultHref);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Enter = next month, 1-6 = focus a slider.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialogOpen || !st.started || st.finished) return;
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" && (t as HTMLInputElement).type === "number";
      if (e.key === "Enter" && !typing && t.tagName !== "BUTTON" && t.tagName !== "A") {
        e.preventDefault();
        goNext();
      } else if (/^[1-6]$/.test(e.key) && !typing) {
        panel.current?.focusRow(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!hydrated) return <GameSkeleton />;

  if (!st.started) {
    return (
      <Intro
        key={linkTask ?? "free"}
        script={script}
        initialTask={linkTask}
        onStart={(task) => {
          setFlipIn(true);
          st.start(task);
        }}
      />
    );
  }

  if (st.finished && !dialogOpen) {
    return (
      <main className="mx-auto max-w-[1080px] px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">这一局已经走完 12 个月</h1>
        <div className="mt-8 flex justify-center gap-3">
          <Link href={resultHref} className={btn("primary")}>
            查看结算
          </Link>
          <Button variant="outline" onClick={() => st.reset()}>
            重新开始
          </Button>
        </div>
      </main>
    );
  }

  const activeMoment = !dialogOpen && !st.finished ? script.months[st.history.length]?.moment : undefined;
  const chooseMoment = (o: MomentOption, index: number, reason: MonthNote["reason"] | null) => {
    st.chooseMoment(st.history.length, index, o.effect ? applyEffect(st.draft, o.effect) : null, reason ?? undefined);
  };

  // the page behind the dialog already shows the new month; only a finished game keeps showing month 12
  const shownMonth = st.finished && st.last ? st.last.month : st.history.length;
  const month = script.months[shownMonth];
  const shownHistory = st.history.slice(0, shownMonth);
  // The chart redraw waits until the settle dialog is closed: drawing the new segment while the dialog rises was the
  // main source of long frames (see DECISIONS). While a dialog is open the chart keeps showing the previous round.
  const chartHistory = chartLen === null || (!dialogOpen && !settling) ? shownHistory : st.history.slice(0, Math.min(chartLen, shownMonth));
  const previous = st.history.at(-1)?.alloc ?? null;
  const prevMonthNo = shownMonth === 0 ? 12 : shownMonth;
  const lastPnl = shownHistory.at(-1)?.pnl ?? null;

  return (
    <div style={{ perspective: 1600 }} className={flipIn ? "overflow-x-clip" : undefined}>
      <motion.div initial={flipIn && !reduce ? { rotateY: 90 } : false} animate={{ rotateY: 0 }} transition={{ duration: 0.32, ease: [0.65, 0, 0.35, 1] }} style={{ transformOrigin: "left center" }}>
    <main className="mx-auto max-w-[1120px] px-4 pb-10 md:px-6" data-zoom-area>
      <div ref={shakeRef}>
      <StatusBar round={shownMonth + 1} total={script.months.length} label={month.label} cash={st.cash} startCash={script.startCash} lastPnl={lastPnl} />
      <BoardNav task={st.task} />
      <div className="mt-4 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1.25fr_1fr] md:gap-6">
        {/* A new month replaces what is on screen: these entrances start at 0.6, never at 0, or the columns blink out for a frame. */}
        <Enter key={`head-${shownMonth}`} delay={0} from={TURN_FROM} y={10} className="md:col-span-2 lg:col-span-1">
          <section id="board-news" aria-label="本月头条" className="scroll-mt-28 space-y-3">
            <Step n={1}>看消息</Step>
            <h2 className="font-bold">
              {month.label}初 · 头条
            </h2>
            {density === "full" && (
              <Thermometer ret={shownMonth === 0 ? script.preMonths.at(-1)?.marketReturn ?? 0 : script.months[shownMonth - 1].marketReturn} monthNo={prevMonthNo} />
            )}
            {month.headlines.map((h, k) => (
              <Enter key={h.text} delay={0.06 + k * 0.05} y={10} from={TURN_FROM}>
                <HeadlineCard headline={h} lead={k === 0} monthNo={prevMonthNo} />
              </Enter>
            ))}
            <Enter delay={0.06 + month.headlines.length * 0.05} y={10} from={TURN_FROM}>
              <RumorCard text={month.rumor} month={shownMonth} stance={st.notes[shownMonth]?.rumor} onStance={st.setNote} />
            </Enter>
          </section>
        </Enter>
        <Enter delay={0.08} className="flex flex-col">
          <Step n={2}>看数据</Step>
          <div id="board-chart" className="flex scroll-mt-28 flex-col gap-4">
            <TrendChart script={script} history={chartHistory} />
            {density === "full" ? (
              <>
                <KnownInfo script={script} round={shownMonth} />
                <Workbench script={script} round={shownMonth} draft={st.draft} />
              </>
            ) : (
              // 精简密度：数据折叠起来，不是删掉——三套主题能看到的信息一样多
              <details className="card-surface group p-4" data-testid="more-data">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold">
                  更多数据
                  <span className="text-right text-xs font-normal text-sub">上月温度 · 已知信息 · 工作台与宏观 ▾</span>
                </summary>
                <div className="mt-4 space-y-4">
                  <Thermometer ret={shownMonth === 0 ? script.preMonths.at(-1)?.marketReturn ?? 0 : script.months[shownMonth - 1].marketReturn} monthNo={prevMonthNo} />
                  <KnownInfo script={script} round={shownMonth} />
                  <Workbench script={script} round={shownMonth} draft={st.draft} />
                </div>
              </details>
            )}
          </div>
        </Enter>
        <Enter key={`alloc-${shownMonth}`} delay={0.08} from={TURN_FROM} y={10}>
          <Step n={3}>做决定</Step>
          <div id="board-alloc" className="scroll-mt-28 space-y-4">
            <AllocationPanel
              ref={panel}
              assets={script.assets}
              value={st.draft}
              onChange={st.setAlloc}
              previous={previous}
              onSubmit={goNext}
              params={script.params}
              task={st.task}
              autofill={autofill}
              onAutofill={(on) => setPrefs({ autofill: on })}
            />
            {/* phone: pinned to the bottom of the screen with a fade above it; desktop: normal flow */}
            <div className="sticky bottom-0 z-30 -mx-4 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-4 pt-8 md:static md:mx-0 md:bg-none md:p-0">
            <p className="mb-2 flex justify-between text-xs text-sub md:hidden">
              <span>
                风险资产 <b className="num text-ink">{100 - st.draft.cash}%</b> · 合计 <b className={`num ${isValidAlloc(st.draft) ? "text-ink" : "text-up"}`}>{allocSum(st.draft)}%</b>
              </span>
              <a href="#board-alloc" className="underline underline-offset-2" onClick={(e) => { e.preventDefault(); document.getElementById("board-alloc")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                去调仓位 ↑
              </a>
            </p>
            <MagneticButton
              data-testid="next-month"
              className="shine relative h-12 w-full rounded-lg bg-gold text-base font-medium text-bg hover:bg-[#ffc933] disabled:cursor-not-allowed disabled:bg-line disabled:text-sub"
              disabled={!valid || settling}
              onClick={goNext}
              sound={false}
            >
              {/* Border Beam: a light runs round the button while it is the next thing to do */}
              {valid && !settling && <span aria-hidden className="beam" style={{ "--beam": "#ffffff" } as React.CSSProperties} />}
              {settling ? (
                <span className="inline-flex items-center gap-1">
                  <span className="shimmer-text">结算中</span>
                  <span className="dots" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
              ) : !isValidAlloc(st.draft) ? (
                "合计需为 100%"
              ) : rule ? (
                rule
              ) : shownMonth === script.months.length - 1 ? (
                "结算最后一个月 →"
              ) : (
                "进入下个月 →"
              )}
            </MagneticButton>
            </div>
            <p className="hidden md:block text-center text-xs text-sub">
              <kbd className="num">Enter</kbd> 进入下个月 · <kbd className="num">1–6</kbd> 选中对应资产
            </p>
          </div>
        </Enter>
      </div>
      </div>
      <BustVignette run={bustRun} />
      {activeMoment && !seen(st.history.length) && <MomentCard key={`${st.history.length}-${st.started}`} moment={activeMoment} onChoose={chooseMoment} />}
      <SettleDialog script={script} last={st.last} open={dialogOpen} onClose={closeDialog} isFinal={st.finished} note={st.last ? st.notes[st.last.month] : undefined} />
    </main>
      </motion.div>
    </div>
  );
}

/**
 * Under the status bar: the task card in play (if any), and on phones three jump links (消息 / 走势 / 仓位) so the
 * long single column does not have to be scrolled by hand between reading and deciding.
 */
function BoardNav({ task }: { task: TaskId | null }) {
  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  if (!task) {
    return (
      <nav aria-label="跳到" className="sticky top-[3.25rem] z-20 -mx-4 mt-2 flex gap-2 bg-bg/90 px-4 py-1.5 backdrop-blur md:hidden">
        <JumpLinks go={go} />
      </nav>
    );
  }
  return (
    <div className="sticky top-[3.25rem] z-20 -mx-4 mt-2 flex items-center gap-2 bg-bg/90 px-4 py-1.5 backdrop-blur md:static md:mx-0 md:mt-3 md:bg-transparent md:p-0 md:backdrop-blur-none">
      <p className="flex min-w-0 items-center gap-1.5 rounded-full border border-gold/50 bg-card px-3 py-1 text-xs" data-testid="task-chip">
        <b className="shrink-0 text-gold">任务 · {TASKS[task].name}</b>
        <span className="hidden truncate text-sub sm:inline">{TASKS[task].short}</span>
      </p>
      <nav aria-label="跳到" className="ml-auto flex shrink-0 gap-1.5 md:hidden">
        <JumpLinks go={go} />
      </nav>
    </div>
  );
}

function JumpLinks({ go }: { go: (id: string) => (e: React.MouseEvent) => void }) {
  return (
    <>
      {[
        ["board-news", "消息"],
        ["board-chart", "走势"],
        ["board-alloc", "仓位"],
      ].map(([id, l]) => (
        <a key={id} href={`#${id}`} onClick={go(id)} className="press rounded-full border border-line bg-card px-3 py-1 text-xs text-sub hover:text-ink">
          {l}
        </a>
      ))}
    </>
  );
}

/** Reading order for the three columns (看消息 → 看数据 → 做决定); on phones the same order top to bottom. */
function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <p className="step">
      <i>{n}</i>
      {children}
    </p>
  );
}

function GameSkeleton() {
  return (
    <main className="mx-auto max-w-[1080px] px-4 py-5" aria-busy>
      <div className="h-8 w-2/3 rounded bg-card animate-pulse" />
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.25fr_1fr]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-80 rounded-xl bg-card animate-pulse" />
        ))}
      </div>
    </main>
  );
}
