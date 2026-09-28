"use client";

import { create, type StoreApi, type UseBoundStore } from "zustand";
import type { PersistOptions } from "zustand/middleware";
import { createJSONStorage, persist } from "zustand/middleware";
import { allCash, settle } from "./engine";
import type { Allocation, GameState, RoundRecord, Script, SettleResult } from "./types";

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
  start: () => void;
  setAlloc: (alloc: Allocation) => void;
  next: () => LastSettle;
  reset: () => void;
}

export const storageKey = (scriptId: string) => `kline-replay:${scriptId}`;

const initial = (script: Script): Omit<GameStore, "start" | "setAlloc" | "next" | "reset"> => ({
  scriptId: script.id,
  month: 0,
  cash: script.startCash,
  history: [],
  finished: false,
  started: false,
  draft: allCash(),
  last: null,
});

type PersistApi = { persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } };
export type GameStoreHook = UseBoundStore<StoreApi<GameStore>> & PersistApi;
export type GamePersistOptions = PersistOptions<GameStore>;

const stores = new Map<string, GameStoreHook>();

/** One persisted store per script, key `kline-replay:{scriptId}`. */
export function gameStore(script: Script) {
  const hit = stores.get(script.id);
  if (hit) return hit;
  const s = create<GameStore>()(
    persist(
      (set, get) => ({
        ...initial(script),
        start: () => set({ started: true }),
        setAlloc: (alloc) => set({ draft: alloc }),
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
          const month = st.month + 1;
          const finished = month >= script.months.length || res.cashAfter <= 0;
          const last: LastSettle = {
            ...res,
            month: st.month,
            alloc: st.draft,
            allocBefore: st.history.at(-1)?.alloc ?? null,
            cashBefore: st.cash,
          };
          set({ history, month: Math.min(month, script.months.length - 1), cash: res.cashAfter, finished, last });
          return last;
        },
        reset: () => set({ ...initial(script) }),
      }),
      { name: storageKey(script.id), storage: createJSONStorage(() => localStorage), version: 1 },
    ),
  );
  stores.set(script.id, s as GameStoreHook);
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
