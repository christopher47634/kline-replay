"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameStoreHook } from "@/game/store";
import { isValidAlloc } from "./AllocationPanel";
import { taskViolation } from "@/game/tasks";
import { runBustFx } from "./BustFx";
import { tick } from "@/lib/sfx";

/** 结算按钮显示「结算中…」的时长，之后翻到新月份 */
const SETTLE_MS = 520;
/** 翻页后结算弹窗升起前的停顿；爆仓要先播完全屏效果 */
const DIALOG_DELAY_MS = 480;
const DIALOG_DELAY_BUST_MS = 700;

/** 当前草稿能否结算：合计 100%、不违反任务卡、这一局还没结束 */
export function canSettle(useGame: GameStoreHook): boolean {
  const s = useGame.getState();
  return !s.finished && isValidAlloc(s.draft) && !taskViolation(s.task, s.draft);
}

/**
 * 「进入下个月」的完整节奏：按钮先显示结算中 → 翻到新月份 → 结算弹窗从按钮处升起；爆仓先播放全屏效果。
 * 减弱动效时跳过所有停顿直接弹窗。
 *
 * chartLen 让走势图在弹窗打开期间停在上一回合：弹窗升起时重画新线段是长帧的主要来源（见 DECISIONS）。
 */
export function useSettleFlow(useGame: GameStoreHook, reduce: boolean) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settling, setSettling] = useState(false);
  const [chartLen, setChartLen] = useState<number | null>(null);
  const [bustRun, setBustRun] = useState(0);
  const shakeRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const goNext = useCallback(() => {
    if (dialogOpen || settling || !canSettle(useGame)) return;
    tick();
    const historyLen = useGame.getState().history.length;
    if (reduce) {
      setChartLen(historyLen);
      useGame.getState().next();
      if (useGame.getState().last?.liquidated) runBustFx(null); // 只有声音和震动
      setDialogOpen(true);
      return;
    }
    setSettling(true);
    setChartLen(historyLen);
    timers.current.push(
      setTimeout(() => {
        useGame.getState().next();
        setSettling(false);
        const bust = useGame.getState().last?.liquidated;
        if (bust) {
          runBustFx(shakeRef.current);
          setBustRun((n) => n + 1);
        }
        timers.current.push(setTimeout(() => setDialogOpen(true), bust ? DIALOG_DELAY_BUST_MS : DIALOG_DELAY_MS));
      }, SETTLE_MS),
    );
  }, [dialogOpen, settling, reduce, useGame]);

  return { dialogOpen, setDialogOpen, settling, chartLen, bustRun, shakeRef, goNext };
}
