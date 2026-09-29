"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMotionPref } from "@/components/shell/MotionPref";
import { useFrameLoop } from "@/lib/frameLoop";

/** One candle that keeps growing to the right, then resets. Runs only while the card is on screen. */
function CandleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { reduce } = useMotionPref();
  const state = useRef({ t: 0, w: 320, h: 120, pts: [] as number[] });

  useEffect(() => {
    const el = box.current!;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    const fit = () => {
      const c = ref.current;
      if (!c) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = el.clientWidth;
      const h = el.clientHeight;
      state.current.w = w;
      state.current.h = h;
      c.width = w * dpr;
      c.height = h * dpr;
      c.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  useFrameLoop((_t, dt) => {
    const s = state.current;
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    s.t += dt;
    const N = 44;
    const n = Math.min(N, Math.floor(s.t / 110));
    if (n >= N + 14) {
      s.t = 0;
      s.pts = [];
    }
    while (s.pts.length < n) {
      const last = s.pts.at(-1) ?? 0.5;
      s.pts.push(Math.max(0.12, Math.min(0.88, last + (Math.random() - 0.48) * 0.16)));
    }
    ctx.clearRect(0, 0, s.w, s.h);
    const bw = s.w / N;
    s.pts.forEach((v, i) => {
      const prev = i ? s.pts[i - 1] : 0.5;
      const up = v >= prev;
      ctx.fillStyle = up ? "#FF4D4F" : "#3FB950";
      const y1 = s.h * (1 - v);
      const y0 = s.h * (1 - prev);
      ctx.fillRect(i * bw + 1, Math.min(y0, y1), bw - 2, Math.max(3, Math.abs(y1 - y0)));
    });
  }, visible && !reduce);

  return (
    <div ref={box} className="absolute inset-y-0 right-0 hidden w-1/2 md:block" aria-hidden>
      <canvas ref={ref} className="h-full w-full opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-r from-card via-transparent to-transparent" />
    </div>
  );
}

export function EventsCard() {
  const { reduce } = useMotionPref();
  return (
    <Link href="/events" className="card-surface relative mt-6 block overflow-hidden p-7 transition-colors hover:border-gold/60 md:p-9 focus-visible:outline-2 focus-visible:outline-gold">
      {!reduce && <CandleCanvas />}
      <div className="relative max-w-[44ch]">
        <div className="flex items-center gap-3">
          <h2 id="events-h" className="font-display text-h1">
            大事件猜涨跌
          </h2>
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">新玩法</span>
        </div>
        <p className="mt-3 text-sub">熔断、股灾、雷曼、疫情……抽 10 张历史事件卡，猜之后 20 个交易日涨还是跌，答案会被演奏出来。</p>
        <p className="mt-4 text-sm text-ink">3 分钟 · 10 张卡 · 测测你的市场直觉 →</p>
      </div>
    </Link>
  );
}
