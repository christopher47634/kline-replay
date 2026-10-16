import { beforeEach, describe, expect, it, vi } from "vitest";
import { bucketsFor, MAGNITUDE_LABELS, recordSeen, seenMap } from "@/events/seen";

const data = new Map<string, string>();
let broken = false;
vi.stubGlobal("localStorage", {
  getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
  setItem: (k: string, v: string) => {
    if (broken) throw new Error("QuotaExceededError");
    data.set(k, v);
  },
});

describe("events/seen", () => {
  beforeEach(() => {
    data.clear();
    broken = false;
  });

  it("records answers per deck", () => {
    recordSeen("a-share", "e1", true);
    recordSeen("a-share", "e2", false);
    recordSeen("global", "e1", false);
    expect(seenMap("a-share")).toEqual({ e1: "ok", e2: "miss" });
    expect(seenMap("global")).toEqual({ e1: "miss" });
  });

  it("treats corrupt or non-object storage as nothing seen", () => {
    data.set("kline:events-seen:a-share", "{not json");
    expect(seenMap("a-share")).toEqual({});
    data.set("kline:events-seen:a-share", "null");
    expect(seenMap("a-share")).toEqual({});
  });

  it("does not throw when storage is full", () => {
    broken = true;
    expect(() => recordSeen("a-share", "e1", true)).not.toThrow();
  });

  it("offers three magnitude buckets on the chosen side", () => {
    expect(bucketsFor(true)).toHaveLength(MAGNITUDE_LABELS.length);
    expect(bucketsFor(false)).toHaveLength(MAGNITUDE_LABELS.length);
    expect(bucketsFor(true)[0]).toBe(bucketsFor(false)[0]); // 「3% 以内」两边共用中间档
  });
});
