"use client";

import type { RoundRecord, Script } from "@/game/types";
import { pct, upDownColor } from "@/lib/format";
import { useResolved } from "@/lib/prefs";
import { plainYear, yearFacts } from "@/lib/voice";

/**
 * 年终复盘，按阅读设置的文风：白话（一句话 + 三点）或研报（年度指标表）。标准文风不加这一块：人格卡就是它。
 * 所有指标都由链接里的 12 次仓位和真实行情重新算出，和上面的曲线同源。
 */
export function YearVoice({ script, history, daily, marketRet, cashRet }: { script: Script; history: RoundRecord[]; daily: { value: number }[]; marketRet: number; cashRet: number }) {
  const { voice } = useResolved();
  if (voice === "standard" || !history.length) return null;
  const f = yearFacts(script, history, daily, marketRet, cashRet);

  if (voice === "plain") {
    const v = plainYear(f);
    return (
      <section aria-label="一年复盘" className="card-surface voice mt-6 p-5 md:p-7" data-testid="year-plain">
        <p className="vp-line text-lg">{v.line}</p>
        <ol className="mt-1 list-decimal space-y-1.5 pl-5 text-sm md:text-base" data-prose>
          {v.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </section>
    );
  }

  const cells: { k: string; v: string; tone?: number; note?: string }[] = [
    { k: "年度收益", v: pct(f.ret), tone: f.ret },
    { k: "超额（对满仓大盘）", v: `${f.excessMarket >= 0 ? "+" : "−"}${Math.abs(f.excessMarket * 100).toFixed(1)}pp`, tone: f.excessMarket },
    { k: "最大回撤", v: pct(f.maxDrawdown), tone: f.maxDrawdown, note: "按日线路径" },
    { k: "月度胜率", v: `${f.winMonths}/${f.months}` },
    { k: "年化波动", v: `${(f.volatility * 100).toFixed(1)}%`, note: "月收益标准差 × √12" },
    { k: "夏普比率", v: f.sharpe === null ? "—" : f.sharpe.toFixed(2), note: "无风险利率取全程现金" },
    { k: "平均风险敞口", v: `${Math.round(f.avgExposure)}%`, note: "非现金仓位" },
    { k: "最好 / 最差月", v: `${pct(f.best.pnl)} / ${pct(f.worst.pnl)}` },
  ];
  return (
    <section aria-label="年度指标" className="card-surface mt-6 p-5 md:p-7" data-testid="year-pro">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">年度指标</h2>
        <span className="text-xs text-sub">研报体 · 由你的 12 次仓位与真实行情计算</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
        {cells.map((c) => (
          <div key={c.k} className="bg-card p-3">
            <dt className="text-xs text-sub">{c.k}</dt>
            <dd className={`num mt-1 text-lg font-bold ${c.tone === undefined ? "" : upDownColor(c.tone)}`}>
              <span data-zoom data-zoom-label={c.k} data-zoom-tone={c.tone === undefined ? undefined : c.tone > 0 ? "up" : c.tone < 0 ? "down" : undefined}>
                {c.v}
              </span>
            </dd>
            {c.note && <dd className="mt-0.5 text-[11px] text-sub">{c.note}</dd>}
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-sub">
        最好的月份是 {f.best.label}，最差的是 {f.worst.label}。游戏用虚拟资金，历史不代表未来。
      </p>
    </section>
  );
}
