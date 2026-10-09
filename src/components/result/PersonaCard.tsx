"use client";

import { m as motion, useInView } from "motion/react";
import { useRef } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { useMotionPref } from "@/components/shell/MotionPref";
import type { KeyMove } from "@/game/persona";
import type { Persona, Rank } from "@/game/types";
import { themeTone, pct } from "@/lib/format";
import { Emoji } from "@/components/ui/Emoji";

/**
 * On-page persona card. It arrives face-down (a "?" and texture), and once it scrolls into view it flips (rotateY 180° → 0)
 * to reveal: the emoji springs in with overshoot, the title reveals character by character, the quote line by line,
 * and the three key moves stagger in. Hover adds a soft tilt and a moving highlight. Reduced motion: shown face-up.
 */
export function PersonaCard({ persona, quote, moves, evidence = [] }: { persona: Persona; quote: string; moves: KeyMove[]; evidence?: string[] }) {
  const { reduce } = useMotionPref();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const up = reduce || seen;

  return (
    <div ref={ref} className="h-full" style={{ perspective: 1400 }}>
      <TiltCard className="h-full" glare>
        <motion.section
          aria-label="投资人格"
          data-testid="persona-card"
          initial={{ rotateY: reduce ? 0 : 180 }}
          animate={{ rotateY: up ? 0 : reduce ? 0 : 180 }}
          transition={{ delay: 0.3, duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative h-full min-h-[300px]"
        >
          {/* back face */}
          <div aria-hidden className="card-surface absolute inset-0 grid place-items-center" style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden", backgroundImage: "repeating-linear-gradient(45deg, transparent 0 10px, rgb(255 255 255 / 0.025) 10px 11px)" }}>
            <Emoji art="question" char="？" size={96} className="persona-back-mark opacity-80" />
          </div>
          {/* front face */}
          <div className="card-surface h-full p-5 md:p-7" style={{ backfaceVisibility: "hidden" }}>
            <p className="text-sm text-sub">你的投资人格</p>
            <div className="mt-3 flex items-center gap-4">
              <motion.span
                className="persona-art inline-block shrink-0"
                aria-hidden
                initial={{ scale: reduce ? 1 : 0 }}
                animate={{ scale: up ? 1 : reduce ? 1 : 0 }}
                transition={{ delay: 0.95, type: "spring", stiffness: 260, damping: 11 }}
              >
                <Emoji art={persona.art} char={persona.emoji} size={72} />
              </motion.span>
              <div>
                <Reveal as="h2" by="chars" inView delay={1.05} className="font-display text-3xl md:text-4xl" style={{ color: themeTone(persona.color) }}>
                  {persona.title}
                </Reveal>
                <p className="mt-1 text-sm text-sub">{persona.desc}</p>
              </div>
            </div>
            <Reveal as="p" inView delay={1.25} className="mt-5 text-lg leading-relaxed">
              {`“${quote}”`}
            </Reveal>
            {evidence.length > 0 && (
              <ul className="mt-4 space-y-1 text-sm text-sub" aria-label="行为依据" data-testid="persona-evidence">
                {evidence.map((e) => (
                  <li key={e} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full" style={{ background: persona.color }} />
                    {e}
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-5 grid gap-2 sm:grid-cols-3">
              {moves.map((m, i) => (
                <motion.li
                  key={m.label}
                  className="rounded-lg bg-bg p-3"
                  initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 16 }}
                  animate={{ opacity: up ? 1 : reduce ? 1 : 0, y: up ? 0 : reduce ? 0 : 16 }}
                  transition={{ delay: 1.4 + i * 0.08, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="text-xs text-sub">{m.label}</p>
                  <p className="mt-1 text-sm">{m.text}</p>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.section>
      </TiltCard>
    </div>
  );
}

/** Fixed 1080x1350 poster rendered off-screen for PNG export. */
export function PersonaPoster({
  persona,
  quote,
  moves,
  ret,
  rank,
  title,
  blocks,
  diffVsMarket,
}: {
  persona: Persona;
  quote: string;
  moves: KeyMove[];
  ret: number;
  rank: Rank;
  title: string;
  blocks: string[];
  diffVsMarket: number;
}) {
  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        background: `radial-gradient(120% 70% at 0% 0%, ${persona.color}33 0%, transparent 60%), radial-gradient(90% 60% at 100% 100%, #bc3e4922 0%, transparent 60%), var(--color-bg)`,
        color: "var(--color-ink)",
        padding: 88,
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ fontSize: 30, color: "var(--color-sub)", letterSpacing: 2 }}>穿越 K 线 · {title}</div>
      <div style={{ marginTop: 48, lineHeight: 1 }}>
        <Emoji art={persona.art} char={persona.emoji} size={132} />
      </div>
      <div style={{ marginTop: 28, fontSize: 96, fontWeight: 900, color: themeTone(persona.color), lineHeight: 1.05 }}>{persona.title}</div>
      <div style={{ marginTop: 12, fontSize: 34, color: "var(--color-sub)" }}>{persona.desc}</div>
      <div style={{ marginTop: 44, fontSize: 40, lineHeight: 1.5, fontWeight: 500 }}>“{quote}”</div>
      <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 30, color: "var(--color-sub)" }}>全年收益</div>
          <div style={{ fontSize: 108, fontWeight: 900, fontFamily: "var(--font-mono)", color: ret > 0 ? "var(--color-up)" : ret < 0 ? "var(--color-down)" : "var(--color-sub)", lineHeight: 1.05 }}>{pct(ret)}</div>
          <div style={{ fontSize: 30, color: "var(--color-sub)", marginTop: 8 }}>
            {diffVsMarket >= 0 ? "跑赢" : "跑输"}满仓大盘 {Math.abs(diffVsMarket * 100).toFixed(1)} 个百分点
          </div>
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, padding: "14px 28px", borderRadius: 999, border: `3px solid ${themeTone(rank.color)}`, color: themeTone(rank.color) }}>{rank.label}</div>
      </div>
      <div style={{ marginTop: 40, display: "flex", gap: 12 }}>
        {blocks.map((c, i) => (
          <div key={i} style={{ width: 64, height: 64, borderRadius: 12, background: c }} />
        ))}
      </div>
      <div style={{ marginTop: 28, display: "flex", gap: 16 }}>
        {moves.map((m) => (
          <div key={m.label} style={{ flex: 1, background: "var(--color-card)", borderRadius: 18, padding: "18px 22px" }}>
            <div style={{ fontSize: 24, color: "var(--color-sub)" }}>{m.label}</div>
            <div style={{ fontSize: 24, marginTop: 6, lineHeight: 1.4 }}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 28, fontSize: 22, color: "var(--color-sub)" }}>虚拟资金 · 历史数据不代表未来 · 不构成任何投资建议</div>
    </div>
  );
}
