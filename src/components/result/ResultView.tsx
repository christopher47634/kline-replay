"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { btn, Button } from "@/components/ui/Button";
import { decodeGame } from "@/game/encode";
import { benchmarks, everLiquidated, isBusted, playAll, rank as rankOf, simulateDaily, totalReturn } from "@/game/engine";
import { judgePersona, keyMoves, pickQuote, PERSONAS } from "@/game/persona";
import { gameStore } from "@/game/store";
import type { Allocation } from "@/game/types";
import { pct, pp, upDownColor } from "@/lib/format";
import { getScript } from "@/lib/scripts";
import { copyText, exportPng, shareText } from "@/lib/share";
import { BlockGrid } from "./BlockGrid";
import { BoardSubmit } from "./BoardSubmit";
import { MusicModal } from "./MusicModal";
import { PersonaCard, PersonaPoster } from "./PersonaCard";
import { ReturnChart } from "./ReturnChart";

export function ResultView({ code, boardOn }: { code: string; boardOn: boolean }) {
  const decoded = useMemo(() => decodeGame(code), [code]);
  const script = decoded.ok ? getScript(decoded.scriptId) : null;
  if (!decoded.ok || !script) return <InvalidLink reason={decoded.ok ? "剧本不存在" : decoded.error} />;
  return <Result code={code} scriptId={script.id} allocs={decoded.allocs} boardOn={boardOn} />;
}

function Result({ code, scriptId, allocs, boardOn }: { code: string; scriptId: string; allocs: Allocation[]; boardOn: boolean }) {
  const script = getScript(scriptId)!;
  const router = useRouter();
  const poster = useRef<HTMLDivElement>(null);
  const [music, setMusic] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/result?s=${code}`;
  const text = shareText({ script, history: r.history, ret: r.ret, rankLabel: r.rank.label, personaTitle: r.persona.title, quote: r.quote, origin });

  const savePoster = async () => {
    if (!poster.current) return;
    try {
      await exportPng(poster.current, `穿越K线-${script.id}-${r.persona.title}.png`, 1080, 1350);
      flash("人格卡已保存");
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
      {r.ret >= other ? "跑赢" : "跑输"}
      {label}
      <span className={`num font-bold mx-1 ${r.ret >= other ? "text-up" : "text-down"}`}>{pp(r.ret, other)}</span>
      个百分点
    </li>
  );

  return (
    <main className="mx-auto max-w-[1080px] px-4 py-10 md:py-14 fade-in">
      <p className="text-sm text-sub">{script.title}</p>
      <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-3">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">
          你的 {script.id}：
          <span data-testid="final-return" className={`num ${upDownColor(r.ret)}`}>
            {pct(r.ret)}
          </span>
        </h1>
        <span className="mb-1 md:mb-2 rounded-full border-2 px-4 py-1 text-base font-bold" style={{ borderColor: r.rank.color, color: r.rank.color }}>
          {r.rank.label}
        </span>
      </div>
      {r.busted && <p className="mt-3 text-up font-medium">爆仓结局：第 {r.history.length} 个月账户归零，游戏提前结束。</p>}

      <section aria-label="收益对比" className="mt-8 rounded-2xl bg-card border border-line p-4 md:p-6">
        <ReturnChart b={r.b} startCash={script.startCash} />
        <ul className="mt-4 grid gap-1.5 text-sm md:text-base md:grid-cols-3">
          {cmp("满仓大盘", r.marketRet)}
          {cmp("全程现金", r.cashRet)}
          {cmp("散户平均", r.b.retailAvg)}
        </ul>
        <p className="mt-3 text-xs text-sub">散户平均：{script.benchmarks.retailAvgNote}</p>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <PersonaCard persona={r.persona} quote={r.quote} moves={r.moves} />
        <section aria-label="每月结果" className="rounded-2xl bg-card border border-line p-5 md:p-7 flex flex-col">
          <p className="text-sm text-sub">12 个月，一月一格</p>
          <div className="mt-4">
            <BlockGrid script={script} history={r.history} />
          </div>
          <p className="mt-3 text-xs text-sub">
            <span className="text-up">■</span> 赚 <span className="text-down ml-2">■</span> 亏 <span className="text-[#A855F7] ml-2">■</span> 强平
          </p>
          <button
            type="button"
            onClick={() => setMusic(true)}
            className="mt-auto pt-6 group text-left"
          >
            <span className="flex items-center gap-3 rounded-xl bg-up/10 border border-up/40 px-4 py-4 group-hover:bg-up/15 transition-colors">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FF4D4F" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
                <rect x="3" y="14" width="5" height="7" rx="1.5" />
                <rect x="16" y="14" width="5" height="7" rx="1.5" />
              </svg>
              <span>
                <span className="block font-bold text-up">听听你的 {script.id}</span>
                <span className="block text-xs text-sub mt-0.5">资产曲线和大盘的二重奏，约 {Math.round(r.daily.length * 0.2)} 秒</span>
              </span>
            </span>
          </button>
        </section>
      </div>

      <section aria-label="分享" className="mt-6 flex flex-wrap gap-2">
        <Button onClick={async () => flash((await copyText(text)) ? "结果文本已复制" : "复制失败")}>复制结果文本</Button>
        <Button variant="outline" onClick={async () => flash((await copyText(link)) ? "链接已复制" : "复制失败")}>
          复制链接
        </Button>
        <Button variant="outline" onClick={savePoster}>
          保存人格卡
        </Button>
        <Button variant="outline" onClick={again}>
          再来一局
        </Button>
        <Link href="/" className={btn("ghost")}>
          换个年份
        </Link>
      </section>

      {boardOn && <BoardSubmit code={code} ret={r.ret} scriptId={script.id} />}

      <details className="mt-8 text-sm text-sub">
        <summary className="cursor-pointer hover:text-ink">分享文本预览</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-card border border-line p-3 font-sans text-ink">{text}</pre>
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

      {music && <MusicModal script={script} daily={r.daily} history={r.history} onClose={() => setMusic(false)} />}

      {toast && (
        <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-8 z-50 rounded-full bg-ink text-bg px-5 py-2 text-sm font-medium fade-in">
          {toast}
        </div>
      )}
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
