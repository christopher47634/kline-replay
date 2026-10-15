import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// frameLoop 在模块加载时碰 document/window，所以先桩好再动态 import
let frames: ((t: number) => void)[] = [];
beforeEach(() => {
  vi.resetModules();
  frames = [];
  vi.stubGlobal("document", { hidden: false, addEventListener: () => {} });
  vi.stubGlobal("window", {});
  vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const step = (t: number) => frames.splice(0).forEach((f) => f(t));

describe("frameLoop", () => {
  it("keeps running when one subscriber throws", async () => {
    const { subscribeFrame } = await import("../frameLoop");
    const good = vi.fn();
    subscribeFrame(() => {
      throw new Error("boom");
    });
    subscribeFrame(good);
    step(16);
    step(32);
    step(48);
    expect(good).toHaveBeenCalledTimes(3);
    expect(frames).toHaveLength(1); // 仍然排着下一帧
  });

  it("stops completely after the last unsubscribe", async () => {
    const { subscribeFrame } = await import("../frameLoop");
    const off = subscribeFrame(() => {});
    step(16);
    off();
    step(32);
    expect(frames).toHaveLength(0);
  });
});
