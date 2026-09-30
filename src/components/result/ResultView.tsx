"use client";

import { AnimatePresence, m as motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MagneticButton } from "@/components/motion/Magnetic";
import { Odometer } from "@/components/motion/Odometer";
import { useMotionPref } from "@/components/shell/MotionPref";
import { btn } from "@/components/ui/Button";
import { decodeGame } from "@/game/encode";
import { benchmarks, everLiquidated, isBusted, playAll, rank as rankOf, simulateDaily, totalReturn } from "@/game/engine";
import { judgePersona, keyMoves, pickQuote, PERSONAS } from "@/game/persona";
import { gameStore } from "@/game/store";
import type { Allocation } from "@/game/types";
import { pct, pp, upDownColor } from "@/lib/format";
import { getScript } from "@/lib/scripts";
import { haptic, play } from "@/lib/sfx";
import { copyText, exportPng, shareText } from "@/lib/share";
import { BlockGrid } from "./BlockGrid";
import { BoardSubmit } from "./BoardSubmit";
import { YearVoice } from "./YearVoice";
import dynamic from "next/dynamic";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";

const MusicModal = dynamic(() => import("./MusicModal").then((m) => m.MusicModal), { ssr: false });
import { PersonaCard, PersonaPoster } from "./PersonaCard";
const ReturnChart = dynamic(() => import("./ReturnChart").then((m) => m.ReturnChart), { ssr: false, loading: () => <ChartSkeleton height={320} /> });

const signedPct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`;

export function ResultView({ code, boardOn, openMusic = false }: { code: string; boardOn: boolean; openMusic?: boolean }) {
  const decoded = useMemo(() => decodeGame(code), [code]);
  const script = decoded.ok ? getScript(decoded.scriptId) : null;
  if (!decoded.ok || !script) return <InvalidLink reason={decoded.ok ? "剧本不存在" : decoded.error} />;
  return <Result code={code} scriptId={script.id} allocs={decoded.allocs} boardOn={boardOn} openMusic={openMusic} />;
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
      {ok ? "✓ 已完成" : label}
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

function Result({ code, scriptId, allocs, boardOn, openMusic }: { code: string; scriptId: string; allocs: Allocation[]; boardOn: boolean; openMusic: boolean }) {
  const script = getScript(scriptId)!;
  const router = useRouter();
  const { reduce } = useMotionPref();
  const poster = useRef<HTMLDivElement>(null);
  const [music, setMusic] = useState(openMusic);
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
    return {
      history,
      ret,
      liquidated,
      busted: isBusted(history),
      rank: rankOf(ret, liquidated),
      personaId,
      persona: PERSONAS[personaId],
      quote: pickQuote(personaId, history),
      moves: keyMoves(history, script),
      b,
      marketRet,
      cashRet,
      daily: simulateDaily(history, script),
    };
  }, [script, allocs]);

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
  const link = `${origin}/result?s=${code}`;
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

  const again = () => {
    gameStore(script).getState().reset();
    router.push(`/play/${script.id}`);
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
              <Odometer testId="final-return-odometer" value={r.ret * 100} format={signedPct} duration={1400} onDone={() => setStamped(true)} />
            </span>
            <span data-testid="final-return" className="sr-only">
              {pct(r.ret)}
            </span>
          </span>
        </h1>
        <motion.span
          className="mb-1 rounded-full border-2 px-4 py-1 text-base font-bold md:mb-2"
          style={{ borderColor: r.rank.color, color: r.rank.color }}
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

      <div className="mt-6 grid items-stretch gap-6 md:grid-cols-[1.4fr_1fr]">
        <PersonaCard persona={r.persona} quote={r.quote} moves={r.moves} />
        <section aria-label="每月结果" className="card-surface flex flex-col p-5 md:p-7">
          <p className="text-sm text-sub">12 个月，一月一格</p>
          <div className="mt-4">
            <BlockGrid script={script} history={r.history} />
          </div>
          <p className="mt-3 text-xs text-sub">
            <span className="text-up">■</span> 赚 <span className="ml-2 text-down">■</span> 亏 <span className="ml-2 text-[#A855F7]">■</span> 强平
          </p>
          <button type="button" onClick={() => setMusic(true)} className="group mt-auto pt-6 text-left">
            <span className="flex items-center gap-3 rounded-xl border border-up/40 bg-up/10 px-4 py-4 transition-colors group-hover:bg-up/15">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FF4D4F" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
                <rect x="3" y="14" width="5" height="7" rx="1.5" />
                <rect x="16" y="14" width="5" height="7" rx="1.5" />
              </svg>
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
        <MagneticButton className={btn("outline")} onClick={again}>
          再来一局
        </MagneticButton>
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
            blocks={r.history.map((h) => (h.liquidated ? "#A855F7" : h.pnl >= 0 ? "#FF4D4F" : "#3FB950"))}
            diffVsMarket={r.ret - r.marketRet}
          />
        </div>
      </div>

      {music && mounted && (
        <MusicModal
          script={script}
          daily={r.daily}
          history={r.history}
          onClose={() => setMusic(false)}
          bigPlay={openMusic}
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
            style={{ background: `linear-gradient(160deg, ${r.persona.color}66, #07090D)` }}
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
