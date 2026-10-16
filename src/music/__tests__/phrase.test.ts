import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 没有音频环境：Tone.js 加载失败，PhrasePlayer 必须照样按节奏回调、照样 resolve
vi.mock("tone", () => {
  throw new Error("no audio in tests");
});
vi.stubGlobal("window", globalThis);

const { PhrasePlayer } = await import("@/music/phrase");

const phrase = (n: number) => ({ notes: Array.from({ length: n }, (_, i) => ({ pitch: "C4", velocity: 0.5, i })) }) as never;

describe("PhrasePlayer without audio", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("steps through every note and then resolves", async () => {
    const player = new PhrasePlayer();
    const steps: number[] = [];
    const done = vi.fn();
    const p = player.play(phrase(20), (_, i) => steps.push(i)).then(done);
    await vi.runAllTimersAsync();
    await p;
    expect(steps).toEqual([...Array(20).keys()]);
    expect(done).toHaveBeenCalledOnce();
  });

  it("cancel() resolves the pending play and stops further steps", async () => {
    const player = new PhrasePlayer();
    const steps: number[] = [];
    const p = player.play(phrase(20), (_, i) => steps.push(i));
    await vi.advanceTimersByTimeAsync(400); // 约 3 个音
    player.cancel();
    await p; // 以前这里永远不会返回
    const seen = steps.length;
    await vi.runAllTimersAsync();
    expect(steps.length).toBe(seen);
    expect(seen).toBeGreaterThan(0);
    expect(seen).toBeLessThan(20);
  });

  it("starting a new phrase cancels the previous one", async () => {
    const player = new PhrasePlayer();
    const first = player.play(phrase(20), () => {});
    await vi.advanceTimersByTimeAsync(100);
    const second = player.play(phrase(2), () => {});
    await vi.runAllTimersAsync();
    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
  });
});
