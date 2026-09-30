import { simulateDaily } from "@/game/engine";
import type { LastSettle } from "@/game/store";
import { ASSET_IDS, type AssetId, type RoundRecord, type Script } from "@/game/types";

/*
 * 复盘文风（借鉴「见微」的做法：同一组事实，三种写法，不新增判断）。
 *   白话  一句话说清赚了还是亏了、比大盘如何、谁帮忙谁拖后腿；再给一句下个月可以想想的事
 *   标准  原来的「事后复盘 + 老股民说」
 *   研报  结论一行 + 收益归因表（每项资产贡献多少个百分点）+ 风险敞口变化 + 月内最大回撤
 * 所有数字都由当月真实行情和玩家当时的仓位算出，和结算弹窗上方的数字同源。
 */

export interface Contribution {
  id: AssetId;
  name: string;
  weight: number;
  /** asset return this month */
  ret: number;
  /** contribution to the portfolio, as a fraction of the money at the start of the month */
  contrib: number;
}

export interface SettleFacts {
  pnl: number;
  market: number;
  excess: number;
  rows: Contribution[];
  riskBefore: number;
  riskAfter: number;
  maxDrawdown: number;
  liquidated: boolean;
}

const risky = (a: Record<AssetId, number> | null) => (a ? 100 - a.cash : 0);

export function settleFacts(script: Script, last: LastSettle): SettleFacts {
  const names = Object.fromEntries(script.assets.map((a) => [a.id, a.name])) as Record<AssetId, string>;
  const month = script.months[last.month];
  const rows = ASSET_IDS.filter((id) => last.alloc[id] > 0).map((id) => {
    const start = last.cashBefore * (last.alloc[id] / 100);
    const gain = last.parts[id] - start;
    return { id, name: names[id], weight: last.alloc[id], ret: start > 0 ? last.parts[id] / start - 1 : 0, contrib: last.cashBefore > 0 ? gain / last.cashBefore : 0 };
  });
  // intramonth path of this month only: same daily model as the charts and the music
  const rec: RoundRecord = { month: last.month, alloc: last.alloc, cashBefore: last.cashBefore, cashAfter: last.cashAfter, pnl: last.pnl, liquidated: last.liquidated } as RoundRecord;
  const path = simulateDaily([rec], { ...script, startCash: last.cashBefore });
  let peak = last.cashBefore;
  let mdd = 0;
  for (const p of path) {
    peak = Math.max(peak, p.value);
    if (peak > 0) mdd = Math.min(mdd, p.value / peak - 1);
  }
  return {
    pnl: last.pnl,
    market: month.marketReturn,
    excess: last.pnl - month.marketReturn,
    rows,
    riskBefore: risky(last.allocBefore),
    riskAfter: risky(last.alloc),
    maxDrawdown: mdd,
    liquidated: last.liquidated,
  };
}

const p1 = (x: number) => `${Math.abs(x * 100).toFixed(1)}%`;
const pp = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x * 100).toFixed(1)}pp`;

/** 白话：一句话 + 为什么 + 下个月可以想想 */
export function plainSettle(f: SettleFacts): { line: string; why: string; next: string } {
  const verb = f.pnl >= 0 ? `赚了 ${p1(f.pnl)}` : `亏了 ${p1(f.pnl)}`;
  const gap = `${(Math.abs(f.excess) * 100).toFixed(1)} 个点`;
  // 亏钱时说「多亏 / 少亏」，赚钱时说「多赚 / 少赚」
  const vs = Math.abs(f.excess) < 0.001 ? "和大盘差不多" : f.pnl < 0 ? (f.excess > 0 ? `比大盘少亏 ${gap}` : `比大盘多亏 ${gap}`) : f.excess > 0 ? `比大盘多赚 ${gap}` : `比大盘少赚 ${gap}`;
  const line = f.liquidated ? `这个月融资仓位被强平，总共${verb}。` : `这个月你${verb}，${vs}。`;
  const sorted = [...f.rows].filter((r) => r.id !== "cash").sort((a, b) => b.contrib - a.contrib);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  let why: string;
  if (!sorted.length) why = "你全仓现金，只拿到了一点利息。";
  else if (best && best.contrib > 0 && worst && worst.contrib < 0 && best !== worst) why = `${best.name}帮了忙（${best.ret >= 0 ? "涨" : "跌"} ${p1(best.ret)}），${worst.name}拖了后腿（${worst.ret >= 0 ? "涨" : "跌"} ${p1(worst.ret)}）。`;
  else if (best && best.contrib >= 0) why = `主要靠${best.name}，它这个月涨了 ${p1(best.ret)}。`;
  else why = `拖后腿最多的是${worst.name}，这个月跌了 ${p1(worst.ret)}。`;
  const dd = f.maxDrawdown < -0.05 ? `月中最难受的时候账户一度回撤 ${p1(f.maxDrawdown)}。` : "";
  const next = f.liquidated
    ? "下个月可以想想：杠杆放大的不只是收益。"
    : f.riskAfter >= 90
      ? `${dd}你几乎满仓，下个月可以想想：要不要留点现金应对意外？`
      : f.riskAfter <= 20
        ? "你大部分是现金，下个月可以想想：是在等机会，还是在躲风险？"
        : `${dd}下个月可以想想：这次赚钱或亏钱的理由，下个月还成立吗？`;
  return { line, why, next };
}

/** 研报：一行结论 + 归因（按贡献从大到小）+ 敞口 + 回撤 */
export function proSettle(f: SettleFacts) {
  const verdict = f.liquidated ? "融资仓位触发强平" : Math.abs(f.excess) < 0.001 ? "与大盘持平" : f.excess > 0 ? `跑赢大盘 ${(f.excess * 100).toFixed(1)} 个百分点` : `跑输大盘 ${(Math.abs(f.excess) * 100).toFixed(1)} 个百分点`;
  const rows = [...f.rows].sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib));
  return {
    conclusion: `组合 ${f.pnl >= 0 ? "+" : "−"}${p1(f.pnl)}，上证 ${f.market >= 0 ? "+" : "−"}${p1(f.market)}，${verdict}。`,
    rows: rows.map((r) => ({ ...r, contribText: pp(r.contrib) })),
    exposure: `${f.riskBefore}% → ${f.riskAfter}%`,
    drawdown: f.maxDrawdown < -0.0005 ? `−${p1(f.maxDrawdown)}` : "无",
  };
}

// ---------------- 年终 ----------------

export interface YearFacts {
  ret: number;
  endCash: number;
  startCash: number;
  excessMarket: number;
  maxDrawdown: number;
  winMonths: number;
  months: number;
  best: { label: string; pnl: number };
  worst: { label: string; pnl: number };
  avgExposure: number;
  volatility: number;
  sharpe: number | null;
}

export function yearFacts(script: Script, history: RoundRecord[], daily: { value: number }[], marketRet: number, cashRet: number): YearFacts {
  const endCash = history.length ? history[history.length - 1].cashAfter : script.startCash;
  const ret = endCash / script.startCash - 1;
  let peak = script.startCash;
  let mdd = 0;
  for (const p of daily) {
    peak = Math.max(peak, p.value);
    if (peak > 0) mdd = Math.min(mdd, p.value / peak - 1);
  }
  const pnls = history.map((h) => h.pnl);
  const bi = pnls.indexOf(Math.max(...pnls));
  const wi = pnls.indexOf(Math.min(...pnls));
  const mean = pnls.reduce((s, x) => s + x, 0) / Math.max(1, pnls.length);
  const sd = Math.sqrt(pnls.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, pnls.length - 1));
  const vol = sd * Math.sqrt(12);
  const n = history.length;
  const annCash = cashRet * (12 / Math.max(1, n));
  const annRet = (1 + ret) ** (12 / Math.max(1, n)) - 1;
  return {
    ret,
    endCash,
    startCash: script.startCash,
    excessMarket: ret - marketRet,
    maxDrawdown: mdd,
    winMonths: pnls.filter((x) => x > 0).length,
    months: n,
    best: { label: script.months[history[bi]?.month ?? 0].label, pnl: pnls[bi] ?? 0 },
    worst: { label: script.months[history[wi]?.month ?? 0].label, pnl: pnls[wi] ?? 0 },
    avgExposure: history.reduce((s, h) => s + (100 - h.alloc.cash), 0) / Math.max(1, n),
    volatility: vol,
    sharpe: vol > 0.0001 ? (annRet - annCash) / vol : null,
  };
}

const wan = (x: number) => `${(x / 10000).toFixed(1)} 万`;

export function plainYear(f: YearFacts) {
  return {
    line: `这一年你把 ${wan(f.startCash)} 变成了 ${wan(f.endCash)}，${f.ret >= 0 ? "赚了" : "亏了"} ${p1(f.ret)}。`,
    points: [
      `${f.months} 个月里有 ${f.winMonths} 个月赚钱。最好的是 ${f.best.label.replace(/^\d+ 年 /, "")}（${f.best.pnl >= 0 ? "+" : "−"}${p1(f.best.pnl)}），最难熬的是 ${f.worst.label.replace(/^\d+ 年 /, "")}（${f.worst.pnl >= 0 ? "+" : "−"}${p1(f.worst.pnl)}）。`,
      `如果一整年什么都不做、满仓大盘，你会${f.excessMarket >= 0 ? `比现在少赚 ${(f.excessMarket * 100).toFixed(1)} 个点` : `比现在多赚 ${(Math.abs(f.excessMarket) * 100).toFixed(1)} 个点`}。`,
      `账户从最高点最多回落过 ${p1(f.maxDrawdown)}——这就是这一年「最难受的那一下」。`,
    ],
  };
}
