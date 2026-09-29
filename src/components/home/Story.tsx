"use client";

import dynamic from "next/dynamic";
import { Reveal } from "@/components/motion/Reveal";
import { useMotionPref } from "@/components/shell/MotionPref";
import { BARS, COPY, HEADLINES, linePath } from "./storyData";

// GSAP ScrollTrigger only loads for the pinned desktop version.
const StoryPinned = dynamic(() => import("./StoryPinned"), { ssr: false });

export function Story() {
  const { reduce, small, ready } = useMotionPref();
  const flat = !ready || reduce || small; // no pinning: three stacked steps
  return flat ? <StoryFlat /> : <StoryPinned />;
}

/* ---------------- flat version (phones, reduced motion) ---------------- */

function StoryFlat() {
  return (
    <section aria-label="怎么玩" className="mx-auto max-w-[1120px] space-y-16 px-6 py-20">
      {COPY.map((c, i) => (
        <div key={c.h} className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <Reveal as="h2" inView className="font-display text-h1">
              {c.h}
            </Reveal>
            <p className="mt-3 text-sub leading-relaxed">{c.p}</p>
          </div>
          <div className="card-surface p-5" aria-hidden>
            {i === 0 && (
              <div className="space-y-3">
                {HEADLINES.slice(0, 2).map((h) => (
                  <div key={h.text} className="relative rounded-xl border border-line bg-elev p-3 pl-4">
                    <span className={`absolute bottom-3 left-0 top-3 w-[3px] rounded-r ${h.tone}`} />
                    <p className="text-xs text-sub">
                      {h.outlet} · <span className="num">{h.day}</span>
                    </p>
                    <p className="mt-1 text-[15px] font-bold">{h.text}</p>
                  </div>
                ))}
              </div>
            )}
            {i === 1 && (
              <div className="space-y-3">
                {BARS.map((b) => (
                  <div key={b.name} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 text-sub">{b.name}</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded bg-bg">
                      <span className="block h-full rounded" style={{ background: b.color, width: `${b.v * 3}%` }} />
                    </span>
                    <span className="num w-10 text-right">{b.v}%</span>
                  </div>
                ))}
              </div>
            )}
            {i === 2 && (
              <svg viewBox="0 0 420 200" className="w-full">
                <path d={linePath()} fill="none" stroke="#FF4D4F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
