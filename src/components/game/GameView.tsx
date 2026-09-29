"use client";

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
import { KnownInfo } from "./KnownInfo";
import { SettleDialog } from "./SettleDialog";
import { StatusBar } from "./StatusBar";
import { Thermometer } from "./Thermometer";
import { TrendChart } from "./TrendChart";
import { tick } from "@/lib/sfx";

export function GameView({ scriptId }: { scriptId: string }) {
  const script = getScript(scriptId) as Script;
  const useGame = useMemo(() => gameStore(script), [script]);
  const st = useGame();
  const [hydrated, setHydrated] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const panel = useRef<AllocationPanelHandle>(null);
  const router = useRouter();

  useEffect(() => {
    setHydrated(useGame.persist.hasHydrated());
    return useGame.persist.onFinishHydration(() => setHydrated(true));
  }, [useGame]);

  const valid = isValidAlloc(st.draft);
  const resultHref = `/result?s=${encodeGame(script.id, st.history.map((h) => h.alloc))}`;

  const goNext = () => {
    if (!valid || dialogOpen || st.finished) return;
    tick();
    st.next();
    setDialogOpen(true);
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

  if (!st.started) return <Intro script={script} onStart={st.start} />;

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

  const shownMonth = dialogOpen && st.last ? st.last.month : st.history.length;
  const month = script.months[shownMonth];
  const shownHistory = st.history.slice(0, shownMonth);
  const previous = st.history.at(-1)?.alloc ?? null;
  const prevMonthNo = shownMonth === 0 ? 12 : shownMonth;
  const lastPnl = shownHistory.at(-1)?.pnl ?? null;

  return (
    <main className="mx-auto max-w-[1080px] px-4 pb-10">
      <StatusBar round={shownMonth + 1} total={script.months.length} label={month.label} cash={st.cash} startCash={script.startCash} lastPnl={lastPnl} />
      <div key={shownMonth} className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1.25fr_1fr]">
        <section aria-label="本月头条" className="space-y-3 md:col-span-2 lg:col-span-1">
          <h2 className="font-bold">
            {month.label}初 · 头条
          </h2>
          <Thermometer ret={shownMonth === 0 ? script.preMonths.at(-1)?.marketReturn ?? 0 : script.months[shownMonth - 1].marketReturn} monthNo={prevMonthNo} />
          {month.headlines.map((h, k) => (
            <HeadlineCard key={h.text} headline={h} lead={k === 0} monthNo={prevMonthNo} />
          ))}
          <RumorCard text={month.rumor} />
        </section>
        <div className="flex flex-col gap-4">
          <TrendChart script={script} history={shownHistory} />
          <KnownInfo script={script} round={shownMonth} />
        </div>
        <div className="space-y-4">
          <AllocationPanel ref={panel} assets={script.assets} value={st.draft} onChange={st.setAlloc} previous={previous} onSubmit={goNext} />
          <Button className="w-full h-12 text-base" disabled={!valid} onClick={goNext}>
            {!valid ? "合计需为 100%" : shownMonth === script.months.length - 1 ? "结算最后一个月 →" : "进入下个月 →"}
          </Button>
          <p className="hidden md:block text-center text-xs text-sub">
            <kbd className="num">Enter</kbd> 进入下个月 · <kbd className="num">1–6</kbd> 选中对应资产
          </p>
        </div>
      </div>
      <SettleDialog script={script} last={st.last} open={dialogOpen} onClose={closeDialog} isFinal={st.finished} />
    </main>
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
