"use client";

import { useRef, useState } from "react";
import { DrawPath } from "@/components/motion/DrawPath";
import { MagneticButton } from "@/components/motion/Magnetic";
import { Odometer } from "@/components/motion/Odometer";
import { Reveal } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { BustVignette, runBustFx } from "@/components/game/BustFx";
import { play, type SfxName } from "@/lib/sfx";

const SFX: SfxName[] = ["tick", "flip", "up", "down", "bust", "ding"];

export function MotionDemo() {
  const [v, setV] = useState(5178);
  const [bust, setBust] = useState(0);
  const shake = useRef<HTMLElement>(null);
  return (
    <main ref={shake} className="mx-auto max-w-[1120px] px-6 py-16 space-y-14">
      <BustVignette run={bust} />
      <h1 className="text-h1 font-display">/dev/motion</h1>

      <section>
        <h2 className="text-h2 mb-4 font-display">Reveal</h2>
        <Reveal as="h2" className="text-h1 font-display" by="chars">
          穿越 K 线
        </Reveal>
        <Reveal className="mt-3 max-w-[30ch] text-sub">回到 2015 年 6 月，沪指 5178 点。如果是你，跑不跑？这是一段会自动换行的说明文字，用来检查按行遮罩揭示。</Reveal>
      </section>

      <section>
        <h2 className="text-h2 mb-4 font-display">Odometer</h2>
        <div className="flex items-center gap-6">
          <Odometer value={v} className="num text-display font-black" />
          <MagneticButton className="h-10 rounded-lg bg-gold px-4 text-sm font-medium text-bg" onClick={() => setV(Math.round(1000 + Math.random() * 6000))}>
            换个数
          </MagneticButton>
        </div>
      </section>

      <section>
        <h2 className="text-h2 mb-4 font-display">Magnetic + TiltCard</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <TiltCard className="card-surface p-6">
            <p className="font-display text-2xl">2015</p>
            <p className="mt-2 text-sm text-sub">移动鼠标看倾斜与高光</p>
          </TiltCard>
        </div>
      </section>

      <section>
        <h2 className="text-h2 mb-4 font-display">DrawPath</h2>
        <svg viewBox="0 0 400 100" className="w-full max-w-[520px]">
          <DrawPath d="M0 80 C40 20 80 90 120 50 S200 10 240 60 S320 90 400 20" stroke="#FF4D4F" strokeWidth={3} glow />
        </svg>
      </section>

      <section>
        <h2 className="text-h2 mb-4 font-display">Liquidation effect</h2>
        <button
          type="button"
          data-testid="bust-demo"
          onClick={() => {
            runBustFx(shake.current);
            setBust((n) => n + 1);
          }}
          className="h-10 rounded-lg border border-up px-4 text-sm text-up hover:bg-up/10"
        >
          触发强平效果
        </button>
      </section>

      <section>
        <h2 className="text-h2 mb-4 font-display">Sounds</h2>
        <div className="flex flex-wrap gap-2">
          {SFX.map((n) => (
            <button key={n} type="button" onClick={() => play(n)} className="h-10 rounded-lg border border-line px-4 text-sm hover:border-sub">
              {n}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
