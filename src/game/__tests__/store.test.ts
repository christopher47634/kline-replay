import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { allCash } from "../engine";
import { blindScript, mysterySlug, nextMystery } from "@/lib/blind";
import { getScript } from "@/lib/scripts";

const script = getScript("2015")!;

beforeEach(() => {
  vi.resetModules();
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("game saves", () => {
  it("reopens a completed mystery in the same browser session as a fresh game", async () => {
    const { gameStore } = await import("../store");
    const blind = blindScript(script);
    const game = gameStore(blind);
    game.getState().start();
    for (let m = 0; m < 12; m++) game.getState().next();
    expect(game.getState().finished).toBe(true);
    expect(nextMystery([script.id])).toBe(`/mystery/${mysterySlug(script.id)}`);
    const reopened = gameStore(blind).getState();
    expect(reopened.finished).toBe(false);
    expect(reopened.started).toBe(false);
    expect(reopened.history).toEqual([]);
  });

  it("keeps an unfinished mystery and its choices when reopening it", async () => {
    const { gameStore } = await import("../store");
    const blind = blindScript(script);
    const game = gameStore(blind);
    game.getState().start();
    game.getState().setNote(0, { rumor: "doubt" });
    game.getState().next();
    nextMystery([script.id]);
    expect(gameStore(blind).getState()).toMatchObject({ month: 1, started: true, notes: { 0: { rumor: "doubt" } } });
  });

  it("still hydrates and plays when browser storage is unavailable", async () => {
    const denied = () => { throw new Error("Storage access denied"); };
    vi.stubGlobal("localStorage", { getItem: denied, setItem: denied });
    const { gameStore } = await import("../store");
    const game = gameStore(script);
    expect(game.persist.hasHydrated()).toBe(true);
    expect(() => { game.getState().start(); game.getState().next(); }).not.toThrow();
    expect(game.getState().history).toHaveLength(1);
  });

  it("recovers a malformed saved JSON instead of leaving the game on its skeleton", async () => {
    localStorage.setItem("kline-replay:2015", "{broken");
    const { gameStore } = await import("../store");
    const game = gameStore(script);
    expect(game.persist.hasHydrated()).toBe(true);
    expect(game.getState().history).toEqual([]);
    expect(() => game.getState().start()).not.toThrow();
  });

  it("migrates old saves and resets per-game notes without touching the public-year save", async () => {
    localStorage.setItem("kline-replay:2015", JSON.stringify({ version: 1, state: { started: true, history: [], draft: allCash() } }));
    const { gameStore } = await import("../store");
    const regular = gameStore(script);
    expect(regular.getState()).toMatchObject({ task: null, notes: {}, prefill: null, started: true });
    const blind = gameStore(blindScript(script));
    blind.getState().start();
    blind.getState().chooseMoment(1, 0, allCash(), "news");
    blind.getState().reset();
    expect(blind.getState()).toMatchObject({ notes: {}, prefill: null, started: false });
    expect(regular.getState().started).toBe(true);
  });
});
