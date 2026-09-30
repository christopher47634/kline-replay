"use client";

import { useSyncExternalStore } from "react";
import { getMuted, setMuted, subscribeMute } from "@/lib/mute";

/** Site-wide sound switch (fixed top-right). Persists in localStorage `kline:muted`. */
export function MuteButton() {
  const muted = useSyncExternalStore(subscribeMute, getMuted, () => false);
  return (
    <button
      type="button"
      onClick={() => setMuted(!muted)}
      aria-pressed={muted}
      aria-label={muted ? "取消静音" : "静音"}
      title={muted ? "声音已关闭" : "声音已开启"}
      className="lg fixed top-2 right-2 z-[60] grid place-items-center w-9 h-9 rounded-full border border-line bg-bg/80 backdrop-blur text-sub hover:text-ink"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 5 6 9H3v6h3l5 4V5z" />
        {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
      </svg>
    </button>
  );
}
