"use client";

import { LazyMotion } from "motion/react";
import { Cursor } from "./Cursor";
import { LenisProvider } from "./LenisProvider";
import { ReducedMotionProvider } from "./MotionPref";
import { SoundGate } from "./SoundGate";
import { GlassLayer } from "./GlassLayer";
import { Interact } from "./Interact";

/** Providers and always-on layers: motion preferences, smooth scroll, grain, cursor, sound prompt. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ReducedMotionProvider>
      <LazyMotion features={() => import("./motionFeatures").then((m) => m.default)} strict>
      <LenisProvider>
        <div aria-hidden className="grain" />
        <Interact />
        {children}
        <Cursor />
        <GlassLayer />
        <SoundGate />
      </LenisProvider>
      </LazyMotion>
    </ReducedMotionProvider>
  );
}
