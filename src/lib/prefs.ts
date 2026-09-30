"use client";

import { useSyncExternalStore } from "react";

/*
 * Reading preferences (阅读设置), stored per device in localStorage `kline:prefs`.
 * Three skins for three kinds of players, each with its own default font and writing voice:
 *   盘口 pan    专业玩家：深夜盘口配色、专业工作台（仓位风险、真实宏观面板、快捷键），研报体复盘
 *   纸面 paper  一般玩家：借鉴「见微」的纸面编辑部——暖白纸、墨色正文、靛蓝交互、朱红印章，标准复盘
 *   简约 plain  想轻松玩：只留头条、走势和仓位，楷体、大留白，白话复盘
 * The <head> script in layout.tsx applies the same attributes before first paint (no flash).
 */

export type Skin = "pan" | "paper" | "plain";
export type BodyFont = "auto" | "sans" | "serif" | "kai";
export type Voice = "auto" | "plain" | "standard" | "pro";
export type Leading = "auto" | "compact" | "normal" | "airy";
export type Glass = "liquid" | "frost" | "off";

export interface Prefs {
  skin: Skin;
  font: BodyFont;
  voice: Voice;
  scale: number;
  leading: Leading;
  glass: Glass;
}

export const SCALES = [0.9, 1, 1.1, 1.2, 1.3] as const;
export const DEFAULT_PREFS: Prefs = { skin: "pan", font: "auto", voice: "auto", scale: 1, leading: "auto", glass: "liquid" };
import { PREFS_KEY } from "./prefsBoot";
export { PREFS_KEY };

export interface SkinMeta {
  id: Skin;
  name: string;
  who: string;
  traits: string[];
  font: Exclude<BodyFont, "auto">;
  voice: Exclude<Voice, "auto">;
  leading: Exclude<Leading, "auto">;
}

export const SKINS: SkinMeta[] = [
  { id: "pan", name: "盘口", who: "专业玩家", traits: ["深夜盘口配色", "专业工作台：仓位风险 + 真实宏观", "研报体复盘"], font: "sans", voice: "pro", leading: "compact" },
  { id: "paper", name: "纸面", who: "一般玩家", traits: ["纸面编辑部（借鉴见微）", "思源宋体标题", "标准复盘"], font: "sans", voice: "standard", leading: "normal" },
  { id: "plain", name: "简约", who: "轻松玩", traits: ["只留头条、走势和仓位", "霞鹜文楷", "白话复盘"], font: "kai", voice: "plain", leading: "airy" },
];
export const skinMeta = (id: Skin) => SKINS.find((s) => s.id === id)!;

export const FONTS: { id: Exclude<BodyFont, "auto">; name: string; family: string; note: string; license: string }[] = [
  { id: "sans", name: "系统黑体", family: "var(--font-sans)", note: "苹方 / 微软雅黑。字面大、笔画均匀，小字号和低分屏最清楚；数字密集的盘面首选。", license: "系统自带" },
  { id: "serif", name: "思源宋体", family: "var(--font-serif-body)", note: "Noto Serif SC 常规体。有书卷气，适合读头条和复盘这类长段文字；高分屏效果好。", license: "SIL OFL 1.1" },
  { id: "kai", name: "霞鹜文楷 · 屏幕版", family: "var(--font-kai)", note: "基于 Klee One 的开源楷体，屏幕版加粗了笔画。亲切、不刻板，适合轻松地玩。", license: "SIL OFL 1.1" },
];

export const VOICES: { id: Exclude<Voice, "auto">; name: string; note: string }[] = [
  { id: "plain", name: "白话", note: "一句话说清赚了还是亏了、为什么，再给一句下个月可以想想的事。" },
  { id: "standard", name: "标准", note: "事后复盘 + 老股民点评，原来的写法。" },
  { id: "pro", name: "研报", note: "收益归因表、超额收益、风险敞口变化、月内最大回撤，一行结论。" },
];

export const LEADINGS: { id: Exclude<Leading, "auto">; name: string; value: number }[] = [
  { id: "compact", name: "紧凑", value: 1.55 },
  { id: "normal", name: "标准", value: 1.75 },
  { id: "airy", name: "宽松", value: 1.95 },
];

export function sanitize(raw: unknown): Prefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Prefs>;
  return {
    skin: r.skin === "paper" || r.skin === "plain" ? r.skin : "pan",
    font: r.font === "sans" || r.font === "serif" || r.font === "kai" ? r.font : "auto",
    voice: r.voice === "plain" || r.voice === "standard" || r.voice === "pro" ? r.voice : "auto",
    scale: (SCALES as readonly number[]).includes(r.scale as number) ? (r.scale as number) : 1,
    leading: r.leading === "compact" || r.leading === "normal" || r.leading === "airy" ? r.leading : "auto",
    glass: r.glass === "frost" || r.glass === "off" ? r.glass : "liquid",
  };
}

export type Resolved = { skin: Skin; font: Exclude<BodyFont, "auto">; voice: Exclude<Voice, "auto">; leading: Exclude<Leading, "auto">; scale: number; glass: Glass };

export function resolve(p: Prefs): Resolved {
  const m = skinMeta(p.skin);
  return {
    skin: p.skin,
    font: p.font === "auto" ? m.font : p.font,
    voice: p.voice === "auto" ? m.voice : p.voice,
    leading: p.leading === "auto" ? m.leading : p.leading,
    scale: p.scale,
    glass: p.glass,
  };
}

// ---------- store ----------

let state: Prefs = DEFAULT_PREFS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    state = sanitize(JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null"));
  } catch {
    state = DEFAULT_PREFS;
  }
}

export function getPrefs(): Prefs {
  load();
  return state;
}

export function setPrefs(p: Partial<Prefs>) {
  load();
  state = sanitize({ ...state, ...p });
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(state));
  } catch {
    /* private mode: the choice lasts for this visit */
  }
  applyPrefs(resolve(state));
  listeners.forEach((l) => l());
}

export const resetPrefs = () => setPrefs(DEFAULT_PREFS);

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getPrefs,
    () => DEFAULT_PREFS,
  );
}

export function useResolved(): Resolved {
  return resolve(usePrefs());
}

export function applyPrefs(r: Resolved) {
  const el = document.documentElement;
  el.dataset.skin = r.skin;
  el.dataset.font = r.font;
  el.dataset.voice = r.voice;
  el.dataset.glass = r.glass;
  el.style.setProperty("--fs", String(r.scale));
  el.style.setProperty("--lh", String(LEADINGS.find((l) => l.id === r.leading)!.value));
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", r.skin === "pan" ? "#07090D" : r.skin === "paper" ? "#F6F4EF" : "#FAFAF7");
}

