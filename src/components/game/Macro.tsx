"use client";

import { useState } from "react";
import type { Allocation, Script } from "@/game/types";
import { TRADED_IDS } from "@/game/types";
import { pct, upDownColor } from "@/lib/format";
import { MACRO_FETCHED_AT, MACRO_SOURCE, dueThisRound, fmtMacro, knownRows, macroFor, monthMinus, position, roundMonth, type MacroSeries } from "@/lib/macro";
import { Drawer, useDrawer } from "@/components/ui/Drawer";
import { Spark } from "@/components/ui/Spark";

/*
 * 宏观与资金面（真实数据，按发布日期只显示当时已经公布的部分）：
 *   正文里一个入口 → 二级抽屉第一层是 6 个序列的概览，点一行进第二层看明细、发布规则和来源。
 * 盘口主题另有「工作台」：仓位体检 + 宏观快照，直接摆在盘面上。
 */

const mLabel = (m: string) => `${+m.slice(5)} 月`;
const yLabel = (m: string) => `${m.slice(0, 4)} 年 ${+m.slice(5)} 月`;

function useMacroDrawer(script: Script, round: number) {
  const [open, setOpen] = useState(false);
  const drawer = (
    <Drawer open={open} onClose={() => setOpen(false)} title="宏观与资金面" label={`${yLabel(roundMonth(script.id, round))}初 · 当时已经公布的数据`}>
      <Overview script={script} round={round} />
    </Drawer>
  );
  return { open: () => setOpen(true), drawer };
}

export function MacroButton({ script, round }: { script: Script; round: number }) {
  const series = macroFor(script.id);
  const { open, drawer } = useMacroDrawer(script, round);
  if (!series.length) return null;
  return (
    <>
      <button type="button" onClick={open} className="mt-3 flex w-full items-center justify-between rounded-lg border border-line bg-bg px-3 py-2.5 text-sm hover:border-line-2" data-testid="macro-open">
        <span>
          宏观与资金面 <span className="text-sub">· {series.length} 项真实数据</span>
        </span>
        <span aria-hidden className="text-sub">
          →
        </span>
      </button>
      {drawer}
    </>
  );
}

function Overview({ script, round }: { script: Script; round: number }) {
  const { push } = useDrawer();
  const series = macroFor(script.id);
  return (
    <>
      <p className="dr-note">每个数字都按官方发布日期处理：本回合开始时还没公布的月份不显示，所以这里不会剧透。</p>
      <Calendar script={script} round={round} />
      <div className="dr-group">
        <h3 className="dr-h">已经公布的</h3>
        {series.map((s) => {
          const rows = knownRows(s, script.id, round);
          const last = rows[rows.length - 1];
          return (
            <button key={s.id} type="button" className="dr-row" style={{ gridTemplateColumns: "1fr 120px auto" }} onClick={() => push({ key: s.id, title: s.name, body: <Detail s={s} script={script} round={round} /> })}>
              <span className="grid gap-0.5">
                <b className="text-[15px]">{s.name}</b>
                <span className="dr-val num">
                  {last ? `${mLabel(last.m)} ${fmtMacro(s, last.v)}` : "开局时还没有数据"}
                  <Pos rows={rows} />
                </span>
              </span>
              <Spark rows={rows.map((r) => r.v)} base={s.base} future={s.rows.length - rows.length} />
              <span aria-hidden className="text-sub">
                ›
              </span>
            </button>
          );
        })}
      </div>
      <p className="dr-note">
        来源：{MACRO_SOURCE}（国家统计局、人民银行、沪深交易所、中国结算的公开数据），采集于 {MACRO_FETCHED_AT.slice(0, 10)}。仅作阅读参考，不构成投资建议。
      </p>
    </>
  );
}

function Detail({ s, script, round }: { s: MacroSeries; script: Script; round: number }) {
  const rows = knownRows(s, script.id, round);
  const cutoff = monthMinus(roundMonth(script.id, round), s.lag);
  return (
    <>
      <Spark rows={rows.map((r) => r.v)} base={s.base} big future={s.rows.length - rows.length} />
      <p className="dr-note">
        {s.note}。本回合开始时，最新能看到的是 {yLabel(cutoff)} 的数据；虚线之后是还没公布的月份。
        {position(rows) ? ` 最新值处在${position(rows)!.text.replace("近", "最近 ")}的位置。` : ""}
      </p>
      <table className="vr-table num">
        <thead>
          <tr>
            <th>月份</th>
            <th className="r">{s.name}</th>
          </tr>
        </thead>
        <tbody>
          {[...rows].reverse().map((r) => (
            <tr key={r.m}>
              <td>{yLabel(r.m)}</td>
              <td className="r font-bold">{fmtMacro(s, r.v)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} className="text-sub">
              之后的月份：未来不可见
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

/** 盘口主题的专业工作台：仓位体检（按你正在调的仓位）+ 宏观快照（当时已公布的最新值）。 */
export function Workbench({ script, round, draft }: { script: Script; round: number; draft: Allocation }) {
  const series = macroFor(script.id);
  const { open, drawer } = useMacroDrawer(script, round);
  const prev = round === 0 ? script.preMonths.at(-1) : script.months[round - 1];
  const risky = 100 - draft.cash;
  const lev = (risky + draft.margin * (script.params.marginLeverage - 1)) / 100;
  // what last month's moves would have done to the allocation you are setting now (known information only)
  const replay = prev ? TRADED_IDS.reduce((s, id) => s + (draft[id] / 100) * prev.returns[id], 0) + (draft.margin / 100) * (script.params.marginLeverage * prev.returns.sh50) : 0;
  return (
    <section aria-label="专业工作台" className="card-surface p-4" data-testid="workbench">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="shrink-0 font-bold">工作台</h2>
        <span className="text-right text-xs text-sub">盘口主题 · 只用已知信息</span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line text-center">
        <div className="bg-bg p-2">
          <dt className="text-[11px] text-sub">风险敞口</dt>
          <dd className="num mt-0.5 font-bold">
            <span data-zoom data-zoom-label="风险敞口（非现金仓位）">{risky}%</span>
          </dd>
        </div>
        <div className="bg-bg p-2">
          <dt className="text-[11px] text-sub">有效杠杆</dt>
          <dd className="num mt-0.5 font-bold">
            <span data-zoom data-zoom-label="有效杠杆（含融资放大）">{lev.toFixed(2)}×</span>
          </dd>
        </div>
        <div className="bg-bg p-2">
          <dt className="text-[11px] text-sub">重演上月</dt>
          <dd className={`num mt-0.5 font-bold ${upDownColor(replay)}`}>
            <span data-zoom data-zoom-label="若上月行情重演，这套仓位的收益" data-zoom-tone={replay > 0 ? "up" : replay < 0 ? "down" : undefined}>
              {pct(replay)}
            </span>
          </dd>
        </div>
      </dl>
      <button type="button" onClick={open} className="mt-3 grid w-full grid-cols-2 gap-2 text-left min-[400px]:grid-cols-3" aria-label="宏观与资金面：打开明细">
        {series.map((s) => {
          const rows = knownRows(s, script.id, round);
          const last = rows[rows.length - 1];
          return (
            <span key={s.id} className="rounded-lg border border-line bg-bg px-2 py-1.5 hover:border-line-2">
              <span className="block truncate text-[11px] text-sub">{s.name}</span>
              <span className="num block text-sm font-bold">
                {last ? (
                  <span data-zoom data-zoom-label={`${s.name} · ${yLabel(last.m)}`}>
                    {fmtMacro(s, last.v)}
                  </span>
                ) : (
                  "—"
                )}
              </span>
              <span className="block text-[10.5px] leading-snug text-sub">
                {last ? mLabel(last.m) : "未公布"}
                <Pos rows={rows} />
              </span>
            </span>
          );
        })}
      </button>
      <Calendar script={script} round={round} compact />
      <p className="mt-2 text-[11px] text-sub">「重演上月」＝上个月各资产的真实涨跌套在你现在的仓位上，只是一种压力测试，不是预测。</p>
      {drawer}
    </section>
  );
}

/** 历史位置 tag after a value: 近 12 月最高 / 偏低 … */
function Pos({ rows }: { rows: { m: string; v: number }[] }) {
  const p = position(rows);
  if (!p) return null;
  return <span className={`pos pos-${p.tone}`}>{p.text}</span>;
}

/** 本月日程 (after 见微's 「下次验证」): what gets published this month. The value shows up next round. */
function Calendar({ script, round, compact = false }: { script: Script; round: number; compact?: boolean }) {
  const due = dueThisRound(script.id, round);
  if (!due.length) return null;
  const month = yLabel(roundMonth(script.id, round));
  if (compact)
    return (
      <div className="cal mt-3" data-testid="calendar">
        <span className="cal-k">本月将公布</span>
        <ul>
          {due.map((d) => (
            <li key={d.id}>
              <b>{mLabel(d.m)}</b> {d.name}
              <span className="text-sub"> · {d.when}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  return (
    <div className="dr-group" data-testid="calendar">
      <h3 className="dr-h">{month}会公布的</h3>
      <ul className="cal cal-list">
        {due.map((d) => (
          <li key={d.id}>
            <span>
              {yLabel(d.m)} {d.name}
            </span>
            <span className="text-sub">{d.when}</span>
          </li>
        ))}
      </ul>
      <p className="dr-note">日程是事先公开的，数值要等公布以后才知道，下个回合开始时会出现在上面。</p>
    </div>
  );
}
