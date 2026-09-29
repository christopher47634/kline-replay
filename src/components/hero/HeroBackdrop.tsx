"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useMotionPref } from "@/components/shell/MotionPref";

const KlineField = dynamic(() => import("./KlineField"), { ssr: false });

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Weak hardware: few cores or little memory. (A frame-time probe below downgrades anything this misses.) */
function weakDevice(): boolean {
  const n = navigator as Navigator & { deviceMemory?: number };
  return (n.hardwareConcurrency ?? 8) <= 2 || (n.deviceMemory ?? 8) <= 2;
}

/**
 * Hero background. The static WebP + CSS glow is always painted first (it is the LCP element and the
 * fallback for reduced motion / no WebGL / weak GPUs). The R3F particle field loads lazily on top of it.
 * If the first second of frames averages > 30 ms the field is dropped and the static image stays.
 */
export function HeroBackdrop({ onReady }: { onReady?: () => void }) {
  const { reduce, small, touch, ready } = useMotionPref();
  const [mode, setMode] = useState<"static" | "webgl">("static");
  const [started, setStarted] = useState(false);
  const probe = useRef(0);

  useEffect(() => {
    if (!ready) return;
    if (reduce || !hasWebGL() || weakDevice()) {
      setMode("static");
      onReady?.();
      return;
    }
    setMode("webgl");
    // frame-time probe: if the machine cannot keep up, fall back instead of stuttering
    let frames = 0;
    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      frames++;
      if (performance.now() - t0 < 1400) raf = requestAnimationFrame(loop);
      else {
        const avg = (performance.now() - t0) / frames;
        if (avg > 30) setMode("static");
        probe.current = avg;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready, reduce, onReady]);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden" data-hero-mode={mode}>
      <Image src="/hero-fallback.webp" alt="" fill priority sizes="100vw" className={`object-cover transition-opacity duration-500 ${started && mode === "webgl" ? "opacity-0" : "opacity-100"}`} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 12% 0%, rgb(255 77 79 / 0.12), transparent 70%), radial-gradient(60% 50% at 95% 100%, rgb(63 185 80 / 0.08), transparent 70%)" }} />
      {mode === "webgl" && (
        <div className="absolute inset-0">
          <KlineField
            perBar={small ? 10 : 40}
            interactive={!small && !touch}
            bloom={!small}
            onStart={() => setStarted(true)}
            onReady={() => onReady?.()}
          />
        </div>
      )}
    </div>
  );
}
