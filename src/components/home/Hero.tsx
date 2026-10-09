"use client";

import { m as motion } from "motion/react";
import { useState } from "react";
import { HeroBackdrop } from "@/components/hero/HeroBackdrop";
import { FLY_SECONDS } from "@/components/hero/constants";
import { Odometer } from "@/components/motion/Odometer";
import { Reveal } from "@/components/motion/Reveal";
import { useMotionPref } from "@/components/shell/MotionPref";
import { HeroCta } from "./HeroCta";

/** A line that slides up out of a mask (used where the line holds more than plain text). */
function MaskLine({ delay, children }: { delay: number; children: React.ReactNode }) {
  const { reduce } = useMotionPref();
  return (
    <span className="block overflow-hidden pb-1">
      <motion.span className="block" initial={{ y: reduce ? 0 : "110%" }} animate={{ y: 0 }} transition={{ duration: 0.64, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </motion.span>
    </span>
  );
}

export function Hero({ years = ["2015"] }: { years?: string[] }) {
  // the 5178 wheel starts when the backdrop is decided, so it ends together with the particle fly-in
  const [go, setGo] = useState(false);
  return (
    <section className="hero-section relative flex min-h-[100svh] items-center overflow-hidden" aria-label="穿越 K 线">
      <HeroBackdrop onDecided={() => setGo(true)} />
      <div aria-hidden data-scrim className="absolute inset-0 bg-[linear-gradient(90deg,rgb(7_9_13/0.82),rgb(7_9_13/0.35)_45%,transparent_72%)]" />
      <div className="hero-copy relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-24 pt-24">
        {/* one kicker per skin (themes.css .only-*): a terminal quote line / a newspaper masthead / a friendly tag */}
        <p aria-hidden className="hero-kicker mb-5 text-xs md:text-sm">
          <span className="only-pan num">THE MARKET ARCHIVE / 历史行情实验室</span>
          <span className="only-paper">历史复盘特刊 · 二〇一五年六月十二日 · 星期五</span>
          <span className="only-plain">轻松玩 · 一局约 6 分钟 · 不用懂股票也能上手</span>
        </p>
        <Reveal as="h1" by="chars" delay={0.15} className="font-display text-display tracking-tight">
          穿越 K 线
        </Reveal>
        <p className="mt-6 max-w-[34ch] text-xl leading-relaxed text-ink/90 md:text-3xl">
          <MaskLine delay={0.75}>
            回到 2015 年 6 月，沪指{" "}
            <Odometer value={go ? 5178 : 3200} from={3200} duration={FLY_SECONDS * 1000} stagger={30} className="num text-up" /> 点。
          </MaskLine>
          <MaskLine delay={0.85}>如果是你，跑不跑？</MaskLine>
        </p>
        {/* the hook is June; the game starts in January: say so, so the promise and the first screen match */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.6 }} className="mt-3 max-w-[40ch] text-sm text-gold/90 md:text-base">
          从 2015 年 1 月开局，一个月一个月走到这一刻——每一步都只知道当时知道的事。
        </motion.p>
        <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 0.6 }} className="hero-promises mt-7 max-w-[60ch] space-y-1.5 text-sm text-sub">
          <li>真实行情 · 用当时的信息，做自己的决定。</li>
          <li>历史头条 · 基于真实事件改写，不提前剧透。</li>
          <li>听见结果 · 把这一年的选择，谱成一段二重奏。</li>
        </motion.ul>
        <HeroCta scriptId="2015" years={years} />
      </div>
      <p className="hero-scroll-hint absolute bottom-6 right-6 z-10 text-xs text-sub md:right-10">↓ 滚动了解玩法</p>
    </section>
  );
}
