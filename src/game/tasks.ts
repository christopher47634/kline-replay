import { benchmarks, finalValue } from "./engine";
import type { Allocation, DailyPoint, RoundRecord, Script, TaskId } from "./types";

/*
 * 任务卡（可跳过）：历史不变，目标变。同一年、同样的信息，不同任务下合理的选择不一样。
 * 规则只限制每月能交的仓位；结算公式完全不变，所以任务局的结果链接和普通局一样能重算。
 * 每张任务在六个年份都要有解（tasks.test.ts 用「事后最优」策略逐年检查）。
 */

export interface Task {
  id: TaskId;
  name: string;
  /** what counts as done, one line */
  goal: string;
  rules: string[];
  /** status-bar chip */
  short: string;
  /** why the task is interesting */
  pitch: string;
}

export const TASKS: Record<TaskId, Task> = {
  guard: {
    id: "guard",
    name: "守住本金",
    goal: "年末资金不低于本金",
    rules: ["每月风险资产至少 20%，不能一直空仓", "不能用融资"],
    short: "年末不亏 · 风险仓位 ≥ 20% · 不加杠杆",
    pitch: "防守，但不能躲到场外：每个月都得有一部分钱留在市场里。",
  },
  beat: {
    id: "beat",
    name: "跑赢指数",
    goal: "年末收益跑赢满仓上证综指",
    rules: ["融资最多 20%"],
    short: "跑赢大盘 · 融资 ≤ 20%",
    pitch: "不能靠无限加杠杆：选对板块、躲开大跌月，比押满更重要。",
  },
};

export const TASK_IDS = Object.keys(TASKS) as TaskId[];
export const isTask = (x: unknown): x is TaskId => typeof x === "string" && Object.prototype.hasOwnProperty.call(TASKS, x);

export const GUARD_MIN_RISK = 20;
export const BEAT_MAX_MARGIN = 20;

/** Why this allocation breaks the task's rules, or null when it is allowed. */
export function taskViolation(task: TaskId | null | undefined, a: Allocation): string | null {
  if (task === "guard") {
    if (a.margin > 0) return "「守住本金」不能用融资";
    if (100 - a.cash < GUARD_MIN_RISK) return `「守住本金」风险资产至少 ${GUARD_MIN_RISK}%`;
  }
  if (task === "beat" && a.margin > BEAT_MAX_MARGIN) return `「跑赢指数」融资最多 ${BEAT_MAX_MARGIN}%`;
  return null;
}

export interface TaskOutcome {
  done: boolean;
  /** "年末 ¥103,200，守住了本金" */
  line: string;
  /** every month followed the rules (a link edited by hand could break them) */
  legal: boolean;
}

export function taskOutcome(task: TaskId, script: Script, history: RoundRecord[]): TaskOutcome {
  const legal = history.every((h) => taskViolation(task, h.alloc) === null);
  const full = history.length === script.months.length;
  const end = finalValue(script, history);
  const ret = end / script.startCash - 1;
  if (task === "guard") {
    const done = legal && full && end >= script.startCash;
    const gap = Math.round(Math.abs(end - script.startCash)).toLocaleString("en-US");
    return { done, legal, line: done ? `年末比本金多 ¥${gap}，守住了` : full ? `年末比本金少 ¥${gap}，没守住` : "账户中途归零，没守住" };
  }
  const b = benchmarks(script, history);
  const mkt = b.market[script.months.length] / script.startCash - 1;
  const diff = (ret - mkt) * 100;
  const done = legal && full && ret > mkt;
  return { done, legal, line: `${done ? "跑赢" : "跑输"}满仓大盘 ${Math.abs(diff).toFixed(1)} 个百分点` };
}

/** Deepest fall from a running peak along the daily curve (negative, e.g. −0.183). */
export function maxDrawdown(daily: Pick<DailyPoint, "value">[], start: number): number {
  let peak = start;
  let mdd = 0;
  for (const p of daily) {
    peak = Math.max(peak, p.value);
    if (peak > 0) mdd = Math.min(mdd, p.value / peak - 1);
  }
  return mdd;
}
