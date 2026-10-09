"use client";

import dynamic from "next/dynamic";
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
    <div aria-hidden className="hero-art absolute overflow-hidden" data-hero-mode={mode}>
      <div className="hero-chart-head"><span>上证指数 / 2015</span><span className="num">SSE · 000001</span></div>
      <div className={`hero-dark hero-candles absolute inset-0 transition-opacity duration-500 ${started && mode === "webgl" ? "opacity-0" : "opacity-100"}`}><ArchiveCandles /></div>
      <InkLine />
      <div className="hero-chart-quote"><span className="hero-chart-eyebrow">历史高点 · 2015.06.12</span><strong className="num">5,178<span>.19</span></strong><span>那一天，所有人都在谈论股票。</span></div>
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
      <div className="hero-chart-foot"><span>01 / 热望</span><span>06 / 转折</span><span>12 / 回响</span></div>
    </div>
  );
}

/** Daily close-to-close marks; decorative history, never invented OHLC data. */
function ArchiveCandles() {
  const closes = k2015.closes;
  const y = (v: number) => 398 - (v - 2800) / 2500 * 220;
  return <svg className="h-full w-full" viewBox="0 0 640 480" preserveAspectRatio="none">
    {[180, 240, 300, 360, 420].map(v => <line key={v} x1="32" x2="608" y1={v} y2={v} stroke="var(--color-line)" strokeDasharray="2 6" />)}
    {closes.map((v, i) => {
      const prev = i ? closes[i - 1] : k2015.prev;
      const x = 32 + i / (closes.length - 1) * 576;
      return <line key={i} x1={x} x2={x} y1={y(prev)} y2={Math.abs(y(v) - y(prev)) < 2 ? y(prev) + 2 : y(v)} stroke={v >= prev ? 'var(--color-up)' : 'var(--color-down)'} strokeWidth="1.65" strokeLinecap="round" opacity="0.72" />;
    })}
  </svg>;
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
