import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS, resolve, sanitize, skinMeta } from "@/lib/prefs";

describe("prefs.sanitize", () => {
  it.each([null, undefined, 42, "x", [], { skin: "neon", scale: 7, glass: 1, loupe: "no" }])("falls back to defaults for %j", (raw) => {
    expect(sanitize(raw)).toEqual(DEFAULT_PREFS);
  });

  it("keeps every valid choice", () => {
    const p = { skin: "paper", font: "kai", voice: "pro", scale: 1.2, leading: "airy", glass: "frost", updown: "intl", accent: "violet", motion: "reduce", loupe: false, density: "compact", autofill: false } as const;
    expect(sanitize(p)).toEqual(p);
  });

  it("drops unknown keys so old saves cannot smuggle fields in", () => {
    expect(Object.keys(sanitize({ ...DEFAULT_PREFS, evil: 1 }))).toEqual(Object.keys(DEFAULT_PREFS));
  });
});

describe("prefs.resolve", () => {
  it("fills every auto field from the skin", () => {
    for (const skin of ["pan", "paper", "plain"] as const) {
      const r = resolve({ ...DEFAULT_PREFS, skin });
      const m = skinMeta(skin);
      expect(r).toMatchObject({ font: m.font, voice: m.voice, leading: m.leading, density: m.density });
    }
  });

  it("an explicit choice beats the skin default", () => {
    expect(resolve({ ...DEFAULT_PREFS, font: "serif", density: "full" })).toMatchObject({ font: "serif", density: "full" });
  });
});
