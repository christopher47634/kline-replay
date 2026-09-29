"use client";

const KEY = "kline:muted";
const listeners = new Set<() => void>();

export function isMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(v: boolean) {
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    /* private mode: mute only lasts for this page view */
    memory = v;
  }
  listeners.forEach((l) => l());
}

let memory: boolean | null = null;
export const getMuted = () => (memory !== null ? memory : isMuted());

export function subscribeMute(fn: () => void): () => void {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}
