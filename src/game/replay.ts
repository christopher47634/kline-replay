import { allCash, settle } from "./engine";
import { allocSummary, keyMoves } from "./persona";
import { reasonLabel } from "./notes";
import type { Allocation, MonthNote, RoundRecord, Script } from "./types";

/*
 * 三次关键决定回放：当时看到的事 → 你留下的理由 → 最终提交的仓位 → 真实结果 → 单步反事实。
 * 优先用这一年的历史时刻；不够三次时，用全年加仓 / 减仓最多的月份补齐。
 * 反事实只有一种，口径写清楚：「只把这一个月换成上个月的仓位，其他月份不变」，不拿事后最优去比。
 */

export interface ReplayItem {
  month: number;
  /** "10 月" */
  when: string;
  /** what was on the table: the moment card's title, or the month's lead headline */
  saw: string;
  kind: "moment" | "move";
  /** the moment option the player took, e.g. "减半仓" */
  choice: string | null;
  reason: string | null;
  rumor: MonthNote["rumor"] | null;
  /** they changed what the moment card pre-filled before submitting */
  edited: boolean;
  submitted: string;
  /** non-cash share of the submitted allocation */
  risky: number;
  pnl: number;
  market: number;
  gain: number;
  /** same month with last month's allocation (or all cash in month 1) */
  cf: { label: string; pnl: number; gain: number; same: boolean };
}

const sameAlloc = (a: Allocation, b: Allocation) => (Object.keys(a) as (keyof Allocation)[]).every((k) => a[k] === b[k]);

export function decisionReplay(script: Script, history: RoundRecord[], notes: Record<number, MonthNote> = {}): ReplayItem[] {
  const picked: { m: number; kind: ReplayItem["kind"] }[] = [];
  for (const h of history) if (script.months[h.month].moment) picked.push({ m: h.month, kind: "moment" });
  for (const mv of keyMoves(history, script)) {
    if (picked.length >= 3) break;
    if (!picked.some((p) => p.m === mv.month) && mv.month < history.length) picked.push({ m: mv.month, kind: "move" });
  }
  return picked
    .slice(0, 3)
    .sort((a, b) => a.m - b.m)
    .map(({ m, kind }) => {
      const h = history[m];
      const month = script.months[m];
      const note = notes[m] ?? {};
      const prev = m > 0 ? history[m - 1].alloc : allCash();
      const alt = settle(h.cashBefore, prev, month, script.params);
      const choice = kind === "moment" && note.moment !== undefined ? month.moment?.options[note.moment]?.label ?? null : null;
      return {
        month: m,
        when: month.label.replace(/^\d+ 年 /, ""),
        saw: kind === "moment" && month.moment ? month.moment.title : month.headlines[0]?.text ?? "",
        kind,
        choice,
        reason: reasonLabel(note.reason),
        rumor: note.rumor ?? null,
        edited: !!note.edited,
        submitted: allocSummary(h.alloc),
        risky: 100 - h.alloc.cash,
        pnl: h.pnl,
        market: month.marketReturn,
        gain: h.cashAfter - h.cashBefore,
        cf: { label: m > 0 ? "维持上月仓位" : "一直拿着现金", pnl: alt.pnl, gain: alt.cashAfter - h.cashBefore, same: sameAlloc(prev, h.alloc) },
      };
    });
}
