"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { getMuted } from "@/lib/mute";
import { BARS, COPY, HEADLINES, linePath } from "./storyData";

gsap.registerPlugin(ScrollTrigger);

/* ---------------- pinned desktop version ---------------- */

export default function StoryPinned() {
  const root = useRef<HTMLElement>(null);
  const [seg, setSeg] = useState(0);
  const played = useRef(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(el);
      const cards = q("[data-card]");
      const bars = q("[data-bar]");
      const nums = q("[data-num]");
      const copy = q("[data-copy]");
      const line = el.querySelector<SVGPathElement>("[data-line]") ?? undefined;
      const notes = q("[data-note]");
      const len = line?.getTotalLength() ?? 600;
      gsap.set(line ?? [], { strokeDasharray: len, strokeDashoffset: len });
      gsap.set(cards, { x: 160, opacity: 0 });
      gsap.set(bars, { scaleX: 0 });
      gsap.set(copy.slice(1), { opacity: 0, y: 24 });
      gsap.set(q("[data-bars]"), { opacity: 0 });
      gsap.set(q("[data-linebox]"), { opacity: 0 });
      gsap.set(notes, { scale: 0, opacity: 0 });

      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "+=300%",
          pin: true,
          scrub: 0.6,
          onUpdate: (self) => {
            setSeg(Math.min(2, Math.floor(self.progress * 3)));
            if (self.progress > 0.86 && !played.current) {
              played.current = true;
              void playSample();
            }
          },
        },
      });
      // segment 1: headlines slide in and stack
      tl.to(cards, { x: (i) => i * 10, y: (i) => i * 6, opacity: 1, stagger: 0.18, duration: 0.5 }, 0);
      tl.to({}, { duration: 0.35 }); // hold
      // segment 2: cards recede, bars grow and their numbers count up
      tl.to(copy[0], { opacity: 0, y: -24, duration: 0.25 }, 1)
        .to(copy[1], { opacity: 1, y: 0, duration: 0.25 }, 1.1)
        .to(cards, { scale: 0.84, y: (i) => -40 + i * 6, opacity: 0, duration: 0.45 }, 1)
        .to(q("[data-bars]"), { opacity: 1, duration: 0.2 }, 1.1)
        .to(bars, { scaleX: 1, stagger: 0.06, duration: 0.5 }, 1.15);
      nums.forEach((n, i) => {
        const o = { v: 0 };
        tl.to(o, { v: BARS[i].v, duration: 0.5, onUpdate: () => (n.textContent = `${Math.round(o.v)}%`) }, 1.15 + i * 0.06);
      });
      tl.to({}, { duration: 0.3 });
      // segment 3: bars collapse into a line drawn over real data, notes pop
      tl.to(copy[1], { opacity: 0, y: -24, duration: 0.25 }, 2)
        .to(copy[2], { opacity: 1, y: 0, duration: 0.25 }, 2.1)
        .to(bars, { scaleX: 0, stagger: 0.03, duration: 0.3 }, 2)
        .to(q("[data-bars]"), { opacity: 0, duration: 0.2 }, 2.25)
        .to(q("[data-linebox]"), { opacity: 1, duration: 0.2 }, 2.1)
        .to(line ?? [], { strokeDashoffset: 0, duration: 0.6 }, 2.2)
        .to(notes, { scale: 1, opacity: 1, stagger: 0.1, duration: 0.3, ease: "back.out(2)" }, 2.55);
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} aria-label="怎么玩" className="relative h-[100svh] overflow-hidden">
      <div className="mx-auto grid h-full max-w-[1120px] grid-cols-[480px_1fr] items-center gap-16 px-6">
        <div className="card-surface relative h-[380px] w-[480px] overflow-hidden p-5" aria-hidden>
          <div className="relative h-full">
            {HEADLINES.map((h, i) => (
              <div key={h.text} data-card className="absolute inset-x-0 rounded-xl border border-line bg-elev p-4" style={{ top: i * 96 + 8 }}>
                <span className={`absolute bottom-3 left-0 top-3 w-[3px] rounded-r ${h.tone}`} />
                <div className="flex items-center gap-2 text-xs text-sub">
                  {i === 0 && <span className="rounded bg-up/15 px-1.5 py-0.5 font-medium text-up">头条</span>}
                  <span>{h.outlet}</span>
                  <span className="num ml-auto">{h.day}</span>
                </div>
                <p className={`mt-1.5 font-bold leading-snug ${i === 0 ? "text-[17px]" : "text-[15px]"}`}>{h.text}</p>
              </div>
            ))}
            <div data-bars className="absolute inset-0 flex flex-col justify-center gap-4">
              {BARS.map((b) => (
                <div key={b.name} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-sub">{b.name}</span>
                  <span className="relative h-2.5 flex-1 overflow-hidden rounded bg-bg">
                    <span data-bar className="absolute inset-0 origin-left rounded" style={{ background: b.color, transform: `scaleX(0)`, width: `${b.v * 3}%` }} />
                  </span>
                  <span data-num className="num w-10 text-right">0%</span>
                </div>
              ))}
            </div>
            <div data-linebox className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 420 200" className="w-full">
                <path data-line d={linePath()} fill="none" stroke="#FF4D4F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 6px #FF4D4F)" }} />
              </svg>
              {["18%_22%", "46%_8%", "78%_58%"].map((pos) => {
                const [l, t] = pos.split("_");
                return (
                  <span key={pos} data-note className="absolute text-2xl text-gold" style={{ left: l, top: t }}>
                    ♪
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative h-[300px]">
          {COPY.map((c) => (
            <div key={c.h} data-copy className="absolute inset-x-0 top-1/2 -translate-y-1/2">
              <h2 className="font-display text-h1">{c.h}</h2>
              <p className="mt-4 max-w-[36ch] text-lg leading-relaxed text-sub">{c.p}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2" aria-hidden>
        {COPY.map((c, i) => (
          <span key={c.h} className={`h-1.5 rounded-full transition-all duration-300 ${i === seg ? "w-6 bg-gold" : "w-1.5 bg-line"}`} />
        ))}
      </div>
    </section>
  );
}

/** One second of sample melody at the end of step 3 — only if sound is on and audio is already unlocked. */
async function playSample() {
  if (getMuted()) return;
  try {
    const { PhrasePlayer } = await import("@/music/phrase");
    const { composePhrase } = await import("@/music/compose");
    const p = new PhrasePlayer();
    const vals = [100, 102, 104, 103, 107, 110, 108, 112];
    if (await p.prime()) {
      await p.play(composePhrase(vals, 100), () => undefined);
    }
    p.dispose();
  } catch {
    /* silent: the sample is a bonus */
  }
}

