"use client";

import { useEffect, useRef } from "react";

/** 焦点在这些元素上时 Enter 交给元素自己（按钮、链接、展开「更多数据」的 summary、表单控件） */
const INTERACTIVE = /^(BUTTON|A|SUMMARY|INPUT|TEXTAREA|SELECT)$/;

/**
 * 牌桌快捷键：Enter = 进入下个月，1–6 = 选中对应资产的滑块。
 * 有弹窗打开、或 enabled 为 false 时不响应。回调存在 ref 里，只注册一次监听。
 */
export function useGameHotkeys(opts: { enabled: boolean; onNext: () => void; onFocusRow: (row: number) => void }) {
  const latest = useRef(opts);
  latest.current = opts;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { enabled, onNext, onFocusRow } = latest.current;
      if (!enabled || document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return;
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" && (t as HTMLInputElement).type === "number";
      const interactive = INTERACTIVE.test(t.tagName) || t.isContentEditable;
      if (e.key === "Enter" && !typing && !interactive) {
        e.preventDefault();
        onNext();
      } else if (/^[1-6]$/.test(e.key) && !typing) {
        onFocusRow(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
