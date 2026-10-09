"use client";

import { create, type StoreApi, type UseBoundStore } from "zustand";
import type { PersistOptions } from "zustand/middleware";
import { createJSONStorage, persist } from "zustand/middleware";
import { allCash, settle } from "./engine";
import type { Allocation, GameState, MonthNote, RoundRecord, Script, SettleResult, TaskId } from "./types";

export interface LastSettle extends SettleResult {
  month: number;
  alloc: Allocation;
  allocBefore: Allocation | null;
  cashBefore: number;
}

export interface GameStore extends GameState {
  started: boolean;
  draft: Allocation;
  last: LastSettle | null;
  /** task card picked on the intro page (null = 自由玩) */
  task: TaskId | null;
  /** rumour stance, moment choice and reason per month (game/notes.ts); reset with the game */
  notes: Record<number, MonthNote>;
  /** what the moment card pre-filled this month, to tell afterwards whether the player changed it */
  prefill: Allocation | null;
  start: (task?: TaskId | null) => void;
  setAlloc: (alloc: Allocation) => void;
  setNote: (month: number, patch: Partial<MonthNote>) => void;
  /** the moment card's choice: records it and pre-fills the draft */
  chooseMoment: (month: number, option: number, alloc: Allocation | null, reason?: MonthNote["reason"]) => void;
  next: () => LastSettle;
  reset: () => void;
}

const sameAlloc = (a: Allocation, b: Allocation) => (Object.keys(a) as (keyof Allocation)[]).every((k) => a[k] === b[k]);

export const storageKey = (scriptId: string) => `kline-replay:${scriptId}`;

type Actions = "start" | "setAlloc" | "setNote" | "chooseMoment" | "next" | "reset";
const initial = (script: Script): Omit<GameStore, Actions> => ({
  scriptId: script.id,
  month: 0,
  cash: script.startCash,
  history: [],
  finished: false,
  started: false,
  draft: allCash(),
  last: null,
  task: null,
  notes: {},
  prefill: null,
});

type PersistApi = { persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } };
export type GameStoreHook = UseBoundStore<StoreApi<GameStore>> & PersistApi;
export type GamePersistOptions = PersistOptions<GameStore>;

const stores = new Map<string, GameStoreHook>();

/** One persisted store per script, key `kline-replay:{scriptId}`. */
export function gameStore(script: Script) {
  // 盲盒 games save separately: playing 2008 blind must not resume (or spoil) a normal 2008 game
  const slot = script.blind ? `blind-${script.id}` : script.id;
  const hit = stores.get(slot);
  if (hit) {
    // nextMystery clears a completed save before reopening it. Its in-memory copy must reset too.
    try {
      if (hit.getState().finished && localStorage.getItem(storageKey(slot)) === null) hit.getState().reset();
    } catch { /* storage may be disabled; keep the playable in-memory game */ }
    return hit;
  }
  const s = create<GameStore>()(
    persist(
      (set, get) => ({
        ...initial(script),
        start: (task = null) => set({ started: true, task }),
        setAlloc: (alloc) => set({ draft: alloc }),
        setNote: (month, patch) => set((st) => ({ notes: { ...st.notes, [month]: { ...st.notes[month], ...patch } } })),
        chooseMoment: (month, option, alloc, reason) =>
          set((st) => ({
            notes: { ...st.notes, [month]: { ...st.notes[month], moment: option, ...(reason ? { reason } : {}) } },
            prefill: alloc ?? st.draft,
            draft: alloc ?? st.draft,
          })),
        next: () => {
          const st = get();
          if (st.finished) throw new Error("game already finished");
          const res = settle(st.cash, st.draft, script.months[st.month], script.params);
          const rec: RoundRecord = {
            month: st.month,
            alloc: st.draft,
            cashBefore: st.cash,
            cashAfter: res.cashAfter,
            pnl: res.pnl,
            liquidated: res.liquidated,
          };
          const history = [...st.history, rec];
          // did the player change what the moment card pre-filled? (the year-end replay tells the truth about it)
          const note = st.notes[st.month];
          const notes = note?.moment !== undefined && st.prefill ? { ...st.notes, [st.month]: { ...note, edited: !sameAlloc(st.prefill, st.draft) } } : st.notes;
          const month = st.month + 1;
          const finished = month >= script.months.length || res.cashAfter <= 0;
          const last: LastSettle = {
            ...res,
            month: st.month,
            alloc: st.draft,
            allocBefore: st.history.at(-1)?.alloc ?? null,
            cashBefore: st.cash,
          };
          set({ history, month: Math.min(month, script.months.length - 1), cash: res.cashAfter, finished, last, notes, prefill: null });
          return last;
        },
        reset: () => set({ ...initial(script) }),
      }),
      {
        name: storageKey(slot),
        storage: createJSONStorage(() => ({
          getItem: (key) => {
            try {
              const raw = localStorage.getItem(key);
              if (!raw) return null;
              const saved = JSON.parse(raw);
              return saved?.state && Array.isArray(saved.state.history) ? raw : null;
            } catch { return null; }
          },
          setItem: (key, value) => { try { localStorage.setItem(key, value); } catch { /* session still works */ } },
          removeItem: (key) => { try { localStorage.removeItem(key); } catch { /* session still works */ } },
        })),
        version: 2,
        // v1 saves had no task / notes; the moment cards they answered were remembered in separate keys (now per game)
        migrate: (old, v) => (v < 2 ? { ...(old as object), task: null, notes: {}, prefill: null } : old) as GameStore,
      },
    ),
  );
  stores.set(slot, s as GameStoreHook);
  return s as GameStoreHook;
}

/** Read an unfinished game straight from storage (home page "continue" button). */
export function peekSaved(scriptId: string): { month: number; finished: boolean; started: boolean } | null {
  try {
    const raw = localStorage.getItem(storageKey(scriptId));
    if (!raw) return null;
    const st = JSON.parse(raw).state as GameStore;
    return { month: st.history.length, finished: st.finished, started: st.started };
  } catch {
    return null;
  }
}
