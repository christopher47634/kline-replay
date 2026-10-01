"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useMotionPref } from "@/components/shell/MotionPref";
import { useResolved } from "@/lib/prefs";
import k2015 from "./kline2015.json";

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

const PROBE_KEY = "kline:hero-probe";

/**
 * Hero background. The static WebP + CSS glow paints first (LCP element, and the permanent fallback for reduced motion,
 * no WebGL and weak devices). On capable devices a 1-second frame-time probe runs while the static image is shown; only if
 * it passes does the lazy R3F particle field mount and fly in. The verdict is cached in sessionStorage so it never repeats.
 * `onDecided` fires when the final look is known (static, or particles starting) so the copy can sync to it.
 */
export function HeroBackdrop({ onDecided }: { onDecided?: () => void }) {
  const { reduce, small, touch, ready } = useMotionPref();
  const { skin } = useResolved();
  const lightSkin = skin !== "pan";
  const [mode, setMode] = useState<"static" | "webgl">("static");
  const [started, setStarted] = useState(false);
  const decided = useRef(onDecided);
  decided.current = onDecided;

  useEffect(() => {
    if (!ready) return;
    const fallback = () => {
      setMode("static");
      decided.current?.();
    };
    // the paper / plain skins draw the year as an ink line instead of the dark particle field
    if (lightSkin || reduce || !hasWebGL() || weakDevice()) return fallback();
    let cached: string | null = null;
    try {
      cached = sessionStorage.getItem(PROBE_KEY);
    } catch {
      /* private mode: probe every time */
    }
    if (cached === "slow") return fallback();
    if (cached === "ok") return setMode("webgl");
    let frames = 0;
    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      frames++;
      if (performance.now() - t0 < 1000) raf = requestAnimationFrame(loop);
      else {
        const ok = (performance.now() - t0) / frames <= 30;
        try {
          sessionStorage.setItem(PROBE_KEY, ok ? "ok" : "slow");
        } catch {
          /* ignore */
        }
        if (ok) setMode("webgl");
        else fallback();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [ready, reduce, lightSkin]);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden" data-hero-mode={mode}>
      <Image src="/hero-fallback.webp" alt="" fill priority sizes="100vw" className={`hero-dark object-cover transition-opacity duration-500 ${started && mode === "webgl" ? "opacity-0" : "opacity-100"}`} />
      <InkLine />
      <div className="hero-dark absolute inset-0" style={{ background: "radial-gradient(60% 50% at 12% 0%, rgb(255 77 79 / 0.12), transparent 70%), radial-gradient(60% 50% at 95% 100%, rgb(63 185 80 / 0.08), transparent 70%)" }} />
      {mode === "webgl" && (
        <div className="absolute inset-0">
          <KlineField
            perBar={small ? 10 : 40}
            interactive={!small && !touch}
            bloom={!small}
            onStart={() => {
              setStarted(true);
              decided.current?.();
            }}
            onReady={() => undefined}
          />
        </div>
      )}
    </div>
  );
}

/** Paper / plain skins: the 2015 Shanghai Composite drawn as one ink stroke, the 5178 peak marked in red. */
function InkLine() {
  const c = (k2015 as { closes: number[] }).closes;
  const lo = Math.min(...c);
  const hi = Math.max(...c);
  const pk = c.indexOf(hi);
  const x = (i: number) => 380 + (i / (c.length - 1)) * 600;
  // the peak sits at mid height, beside the subtitle: higher up it ran into the end of the 「穿越 K 线」 title
  const y = (v: number) => 392 - ((v - lo) / (hi - lo)) * 190;
  return (
    <svg className="hero-ink absolute inset-0 h-full w-full" viewBox="0 0 1000 420" preserveAspectRatio="xMaxYMid slice">
      <polyline points={c.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} fill="none" stroke="var(--color-ink)" strokeOpacity="0.28" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx={x(pk)} cy={y(hi)} r="4" fill="var(--color-up)" />
      <text x={x(pk) + 8} y={y(hi) - 8} fill="var(--color-up)" fontSize="13" fontFamily="var(--font-mono)">5178</text>
    </svg>
  );
}
