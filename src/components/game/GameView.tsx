"use client";

import { m as motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { btn, Button } from "@/components/ui/Button";
import { encodeGame } from "@/game/encode";
import { gameStore } from "@/game/store";
import type { Script } from "@/game/types";
import { getScript } from "@/lib/scripts";
import { AllocationPanel, isValidAlloc, type AllocationPanelHandle } from "./AllocationPanel";
import { HeadlineCard, RumorCard } from "./HeadlineCard";
import { Intro } from "./Intro";
import { MagneticButton } from "@/components/motion/Magnetic";
import { BustVignette, runBustFx } from "./BustFx";
import { Enter } from "@/components/motion/Enter";
import { useMotionPref } from "@/components/shell/MotionPref";
import { MomentCard } from "./MomentCard";
import { applyEffect } from "@/game/moment";
import { KnownInfo } from "./KnownInfo";
import { useResolved } from "@/lib/prefs";
import { SettleDialog } from "./SettleDialog";
import { StatusBar } from "./StatusBar";
import { Thermometer } from "./Thermometer";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";

// recharts stays out of the first-load bundle; the skeleton holds the space so nothing shifts
// the workbench and the macro drawer (with their data) load after the board is interactive
const Workbench = dynamic(() => import("./Macro").then((m) => m.Workbench), { ssr: false });
const MacroButton = dynamic(() => import("./Macro").then((m) => m.MacroButton), { ssr: false });
const TrendChart = dynamic(() => import("./TrendChart").then((m) => m.TrendChart), { ssr: false, loading: () => <ChartSkeleton height={340} /> });
import { tick } from "@/lib/sfx";

/** Starting opacity for the columns that re-enter when the month turns (see the Enter comment). */
const TURN_FROM = 0.6;

export function GameView({ scriptId }: { scriptId: string }) {
  const script = getScript(scriptId) as Script;
  const useGame = useMemo(() => gameStore(script), [script]);
  const st = useGame();
  const [hydrated, setHydrated] = useState(false);
  const { reduce } = useMotionPref();
  const { skin } = useResolved();
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

  // Historical-moment card: shown once per round, before the allocation panel (remembered across reloads).
  const momentKey = (m: number) => `kline-moment:${script.id}:${m}`;
  const [momentDone, setMomentDone] = useState<Record<number, boolean>>({});
  const seen = (m: number) => {
    if (momentDone[m]) return true;
    try {
      return localStorage.getItem(momentKey(m)) === "1";
    } catch {
      return false;
    }
  };
  const valid = isValidAlloc(st.draft);
  const resultHref = `/result?s=${encodeGame(script.id, st.history.map((h) => h.alloc))}`;

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
        script={script}
        onStart={() => {
          setFlipIn(true);
          st.start();
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
  const chooseMoment = (o: { effect: import("@/game/moment").MomentEffect | null }) => {
    const m = st.history.length;
    if (o.effect) st.setAlloc(applyEffect(st.draft, o.effect));
    setMomentDone((d) => ({ ...d, [m]: true }));
    try {
      localStorage.setItem(momentKey(m), "1");
    } catch {
      /* fine: the card may show again after a reload */
    }
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
      <div className="mt-5 grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1.25fr_1fr] md:gap-6">
        {/* A new month replaces what is on screen: these entrances start at 0.6, never at 0, or the columns blink out for a frame. */}
        <Enter key={`head-${shownMonth}`} delay={0} from={TURN_FROM} y={10} className="md:col-span-2 lg:col-span-1">
          <section aria-label="本月头条" className="space-y-3">
            <h2 className="font-bold">
              {month.label}初 · 头条
            </h2>
            <div data-plain-hide>
            <Thermometer ret={shownMonth === 0 ? script.preMonths.at(-1)?.marketReturn ?? 0 : script.months[shownMonth - 1].marketReturn} monthNo={prevMonthNo} />
            </div>
            {month.headlines.map((h, k) => (
              <Enter key={h.text} delay={0.06 + k * 0.05} y={10} from={TURN_FROM}>
                <HeadlineCard headline={h} lead={k === 0} monthNo={prevMonthNo} />
              </Enter>
            ))}
            <Enter delay={0.06 + month.headlines.length * 0.05} y={10} from={TURN_FROM}>
              <RumorCard text={month.rumor} />
            </Enter>
          </section>
        </Enter>
        <Enter delay={0.08} className="flex flex-col">
          <div className="flex flex-1 flex-col gap-4">
            <TrendChart script={script} history={chartHistory} />
            <div data-plain-hide>
              <KnownInfo script={script} round={shownMonth} />
              {skin !== "pan" && <MacroButton script={script} round={shownMonth} />}
            </div>
            {skin === "pan" && <Workbench script={script} round={shownMonth} draft={st.draft} />}
          </div>
        </Enter>
        <Enter key={`alloc-${shownMonth}`} delay={0.08} from={TURN_FROM} y={10}>
          <div className="space-y-4">
            <AllocationPanel ref={panel} assets={script.assets} value={st.draft} onChange={st.setAlloc} previous={previous} onSubmit={goNext} />
            {/* phone: pinned to the bottom of the screen with a fade above it; desktop: normal flow */}
            <div className="sticky bottom-0 z-30 -mx-4 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pb-4 pt-8 md:static md:mx-0 md:bg-none md:p-0">
            <MagneticButton
              data-testid="next-month"
              className="h-12 w-full rounded-lg bg-gold text-base font-medium text-bg hover:bg-[#ffc933] disabled:cursor-not-allowed disabled:bg-line disabled:text-sub"
              disabled={!valid || settling}
              onClick={goNext}
              sound={false}
            >
              {settling ? (
                <span className="inline-flex items-center gap-1">
                  结算中
                  <span className="dots" aria-hidden>
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
              ) : !valid ? (
                "合计需为 100%"
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
      {activeMoment && !seen(st.history.length) && <MomentCard key={st.history.length} moment={activeMoment} onChoose={chooseMoment} />}
      <SettleDialog script={script} last={st.last} open={dialogOpen} onClose={closeDialog} isFinal={st.finished} />
    </main>
      </motion.div>
    </div>
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
