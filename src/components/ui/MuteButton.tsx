"use client";

import { useSyncExternalStore } from "react";
import { getMuted, setMuted, subscribeMute } from "@/lib/mute";
import { Volume2, VolumeX } from "lucide-react";

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
      {muted ? <VolumeX size={18} strokeWidth={1.9} aria-hidden /> : <Volume2 size={18} strokeWidth={1.9} aria-hidden />}
    </button>
  );
}
