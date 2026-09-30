"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

const SettingsDrawer = dynamic(() => import("./SettingsDrawer"), { ssr: false });

/** 阅读设置 (fixed top-right, next to the sound switch). Level 1: skin, size, leading, glass; level 2: font and voice samples. */
export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="阅读设置：主题、字体、字号、文风"
        title="阅读设置"
        className="lg fixed top-2 right-12 z-[60] grid h-9 w-9 place-items-center rounded-full border border-line bg-bg/80 text-sub backdrop-blur hover:text-ink"
      >
        <span aria-hidden className="text-[13px] font-bold leading-none tracking-tight">
          A<span className="text-[10px]">a</span>
        </span>
      </button>
      {open && <SettingsDrawer onClose={close} />}
    </>
  );
}
