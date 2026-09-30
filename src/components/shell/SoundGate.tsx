"use client";

import { AnimatePresence, m as motion } from "motion/react";
import { useEffect, useState } from "react";
import { setMuted } from "@/lib/mute";
import { play, preloadSfx, unlockAudio } from "@/lib/sfx";

const KEY = "kline:sound-asked";

/**
 * First visit: a small 4-second hint bottom-right, "开启声音". Clicking it unlocks audio (browsers need a gesture).
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
    const first = () => void preloadSfx();
    window.addEventListener("pointerdown", first, { once: true });
    if (!asked) {
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="lg glass fixed bottom-[5.5rem] right-4 md:bottom-5 md:right-5 z-[80] rounded-full border border-line px-4 py-2 text-sm text-ink shadow-lg hover:border-gold"
        >
          🔊 开启声音，体验更完整
        </motion.button>
      )}
    </AnimatePresence>
  );
}
