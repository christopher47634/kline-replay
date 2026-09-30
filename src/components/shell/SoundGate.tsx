"use client";

import { AnimatePresence, m as motion } from "motion/react";
import { useEffect, useState } from "react";
import { setMuted } from "@/lib/mute";
import { play, preloadSfx, unlockAudio } from "@/lib/sfx";
import { Volume2 } from "lucide-react";

const KEY = "kline:sound-asked";

/**
 * First visit only: a small 4-second hint, "开启声音" (desktop bottom-right; phones right under the sound button, so it
 * never lands on the page's own buttons). Clicking it unlocks audio (browsers need a gesture); any other tap dismisses it.
 * Any first click/tap anywhere also loads the clips, so later sound effects are instant.
 */
export function SoundGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let asked = false;
    try {
      asked = localStorage.getItem(KEY) === "1";
    } catch {
      /* private mode: just show it once per page view */
    }
    const first = (e: PointerEvent) => {
      void preloadSfx();
      if (!(e.target as Element | null)?.closest?.("[data-sound-gate]")) setShow(false);
    };
    window.addEventListener("pointerdown", first, { once: true });
    if (!asked) {
      try {
        localStorage.setItem(KEY, "1"); // shown once per device, tapped or not
      } catch {
        /* ignore */
      }
      const t1 = setTimeout(() => setShow(true), 900);
      const t2 = setTimeout(() => setShow(false), 900 + 4000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        window.removeEventListener("pointerdown", first);
      };
    }
    return () => window.removeEventListener("pointerdown", first);
  }, []);

  const accept = async () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setMuted(false);
    await unlockAudio();
    play("ding", 0.5);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={accept}
          data-sound-gate
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="lg glass fixed right-2 top-[3.25rem] md:bottom-5 md:right-5 md:top-auto z-[80] rounded-full border border-line px-4 py-2 text-sm text-ink shadow-lg hover:border-gold"
        >
          <span className="inline-flex items-center gap-1.5">
            <Volume2 size={16} strokeWidth={2} aria-hidden className="text-gold" />
            开启声音，体验更完整
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
