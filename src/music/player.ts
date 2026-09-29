"use client";

import type { Composition, Note } from "./compose";

type ToneNS = typeof import("tone");

export interface SyncStats {
  samples: number;
  maxMs: number;
  avgMs: number;
}

export interface PlayerCallbacks {
  /** Fired on the animation frame closest to when a note sounds. */
  onStep: (note: Note, index: number) => void;
  onEnd: () => void;
}

/** 0.2 s per note at 1x == an eighth note at 150 BPM. */
const BASE_BPM = 150;

/**
 * Tone.js scheduler for the duet. Tone is imported lazily so SSR never touches
 * Web Audio, and `ensureStarted()` must be called from a user gesture.
 */
export class DuetPlayer {
  private tone: ToneNS | null = null;
  private lead: InstanceType<ToneNS["PolySynth"]> | null = null;
  private bass: InstanceType<ToneNS["MonoSynth"]> | null = null;
  private kicks: InstanceType<ToneNS["MembraneSynth"]>[] = [];
  private warned = false;
  private cymbal: InstanceType<ToneNS["MetalSynth"]> | null = null;
  private master: InstanceType<ToneNS["Volume"]> | null = null;
  private eventId: number | null = null;
  private index = 0;
  private drift: number[] = [];
  rate: 1 | 2 = 1;
  playing = false;

  constructor(
    private comp: Composition,
    private cb: PlayerCallbacks,
  ) {}

  get position() {
    return this.index;
  }

  get length() {
    return this.comp.notes.length;
  }

  async ensureStarted(): Promise<boolean> {
    const Tone = (this.tone ??= await import("tone"));
    await Tone.start();
    if (!this.lead) {
      // Smaller lookahead keeps the Draw callbacks (canvas) tight to the audio clock.
      Tone.getContext().lookAhead = 0.05;
      this.master = new Tone.Volume(-6).toDestination();
      this.lead = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.3 },
      }).connect(this.master);
      this.bass = new Tone.MonoSynth({
        oscillator: { type: "sawtooth" },
        filter: { Q: 1, type: "lowpass", rolloff: -24 },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.6 },
        filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.3, baseFrequency: 120, octaves: 2.5 },
      }).connect(this.master);
      this.bass.volume.value = -8;
      // Mono voices assert on overlapping starts, so a liquidation triple-hit needs one voice per hit.
      this.kicks = [0, 1, 2].map(() => new Tone.MembraneSynth({ octaves: 6, pitchDecay: 0.05 }).connect(this.master!));
      this.cymbal = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.4, release: 0.2 }, harmonicity: 5.1, resonance: 4000, octaves: 1.5 }).connect(this.master);
      this.cymbal.volume.value = -18;
    }
    return Tone.getContext().state === "running";
  }

  private schedule() {
    const Tone = this.tone!;
    const transport = Tone.getTransport();
    transport.bpm.value = BASE_BPM * this.rate;
    if (this.eventId !== null) transport.clear(this.eventId);
    this.eventId = transport.scheduleRepeat((time) => {
      const i = this.index;
      const note = this.comp.notes[i];
      if (!note) {
        Tone.getDraw().schedule(() => this.finish(), time);
        return;
      }
      this.sound(note, time);
      Tone.getDraw().schedule(() => {
        this.drift.push(Math.abs(Tone.getContext().currentTime - time) * 1000);
        this.cb.onStep(note, i);
      }, time);
      this.index = i + 1;
    }, "8n");
  }

  private sound(n: Note, time: number) {
    try {
      const step = 0.2 / this.rate;
      this.lead!.triggerAttackRelease(n.pitch, step * 0.9, time, n.velocity);
      if (n.ornament) this.lead!.triggerAttackRelease(n.ornament, step * 0.4, time + step * 0.5, n.velocity * 0.8);
      // Must end before the next bass note (5 steps later) so the mono voice never overlaps itself.
      if (n.bass) this.bass!.triggerAttackRelease(n.bass.pitch, Math.min(step * 4, step * 4.5), time, n.bass.velocity);
      const cymbal = n.perc.find((p) => p.voice === "cymbal");
      if (cymbal) this.cymbal!.triggerAttackRelease("C6", "16n", time, cymbal.velocity);
      for (const p of n.perc) {
        if (p.voice !== "kick") continue;
        for (let k = 0; k < p.hits; k++) this.kicks[k % this.kicks.length].triggerAttackRelease("C1", "8n", time + k * step * 0.33, p.velocity);
      }
    } catch (e) {
      if (!this.warned) {
        this.warned = true;
        console.warn("[music] 音符触发失败，已跳过", e);
      }
    }
  }

  private finish() {
    this.pause();
    this.index = this.comp.notes.length;
    this.cb.onEnd();
  }

  async play() {
    if (!(await this.ensureStarted())) return false;
    if (this.index >= this.comp.notes.length) this.index = 0;
    this.schedule();
    this.tone!.getTransport().start();
    this.playing = true;
    return true;
  }

  pause() {
    if (!this.tone) return;
    this.tone.getTransport().pause();
    this.playing = false;
  }

  stop() {
    if (this.tone) {
      const t = this.tone.getTransport();
      t.stop();
      if (this.eventId !== null) t.clear(this.eventId);
      this.eventId = null;
    }
    this.playing = false;
    this.index = 0;
  }

  seek(index: number) {
    this.index = Math.max(0, Math.min(this.comp.notes.length - 1, Math.round(index)));
  }

  setRate(rate: 1 | 2) {
    this.rate = rate;
    if (this.tone) this.tone.getTransport().bpm.value = BASE_BPM * rate;
  }

  syncStats(): SyncStats {
    const n = this.drift.length;
    return { samples: n, maxMs: n ? Math.max(...this.drift) : 0, avgMs: n ? this.drift.reduce((a, b) => a + b, 0) / n : 0 };
  }

  dispose() {
    this.stop();
    for (const node of [this.lead, this.bass, ...this.kicks, this.cymbal, this.master]) node?.dispose();
    this.lead = this.bass = this.cymbal = this.master = null;
    this.kicks = [];
  }
}
