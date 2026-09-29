"use client";

import { Cursor } from "./Cursor";
import { LenisProvider } from "./LenisProvider";
import { ReducedMotionProvider } from "./MotionPref";
import { SoundGate } from "./SoundGate";

/** Providers and always-on layers: motion preferences, smooth scroll, grain, cursor, sound prompt. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ReducedMotionProvider>
      <LenisProvider>
        <div aria-hidden className="grain" />
        {children}
        <Cursor />
        <SoundGate />
      </LenisProvider>
    </ReducedMotionProvider>
  );
}
