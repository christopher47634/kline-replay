"use client";

import { getMuted, subscribeMute } from "@/lib/mute";
import type { Phrase, PhraseNote } from "./compose";

const NOTE_SEC = 0.12;
const LEVEL_DB = -8;
const MUTED_DB = -60;

/**
 * Plays an event-mode phrase (20 notes, 0.12 s each) on a lead synth and reports each note on a timer
 * aligned to when it sounds, so the growing line stays in step with the audio. Tone.js is loaded lazily;
 * if audio cannot start the reveal still animates, just silently.
 */
export class PhrasePlayer {
  private synth: import("tone").PolySynth | null = null;
  private volume: import("tone").Volume | null = null;
  private unsub: (() => void) | null = null;
  private timers: number[] = [];

  /** Call from a user gesture the first time (the guess button click). */
  async prime(): Promise<boolean> {
    try {
      const Tone = await import("tone");
      await Tone.start();
      if (!this.synth) {
        this.volume = new Tone.Volume(getMuted() ? MUTED_DB : LEVEL_DB).toDestination();
        this.synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.01, decay: 0.08, sustain: 0.3, release: 0.15 },
        }).connect(this.volume);
        this.unsub = subscribeMute(() => {
          if (this.volume) this.volume.volume.value = getMuted() ? MUTED_DB : LEVEL_DB;
        });
      }
      return Tone.getContext().state === "running";
    } catch {
      return false;
    }
  }

  /** Resolves after the last note. `onStep(note, i)` fires as each note sounds. */
  async play(phrase: Phrase, onStep: (n: PhraseNote, i: number) => void): Promise<void> {
    const audio = await this.prime();
    const Tone = audio ? await import("tone") : null;
    const start = Tone ? Tone.now() + 0.05 : 0;
    return new Promise((resolve) => {
      phrase.notes.forEach((n, i) => {
        if (Tone && this.synth) {
          try {
            this.synth.triggerAttackRelease(n.pitch, NOTE_SEC * 0.9, start + i * NOTE_SEC, n.velocity);
          } catch {
            /* keep animating even if a note is rejected */
          }
        }
        this.timers.push(window.setTimeout(() => onStep(n, i), 50 + i * NOTE_SEC * 1000));
      });
      this.timers.push(window.setTimeout(resolve, 50 + phrase.notes.length * NOTE_SEC * 1000 + 150));
    });
  }

  cancel() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
  }

  dispose() {
    this.cancel();
    this.unsub?.();
    this.unsub = null;
    this.synth?.dispose();
    this.volume?.dispose();
    this.synth = this.volume = null;
  }
}
