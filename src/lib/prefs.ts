"use client";

import { useSyncExternalStore } from "react";

/*
 * Reading preferences (阅读设置), stored per device in localStorage `kline:prefs`.
 * Three skins for three kinds of players, each with its own default font and writing voice:
 *   盘口 pan    专业玩家：雾蓝玻璃配色、专业工作台（仓位风险、真实宏观面板、快捷键），研报体复盘
 *   纸面 paper  一般玩家：借鉴「见微」的纸面编辑部——暖白纸、墨色正文、靛蓝交互、朱红印章，标准复盘
 *   简约 plain  想轻松玩：头条、走势和仓位在前，其余数据折叠（不是删掉），楷体、大留白，白话复盘
 * 信息密度和主题分开：三套主题都能看到同样的数据，「密度」只决定次要面板是展开还是折叠。
 * The <head> script in layout.tsx applies the same attributes before first paint (no flash).
 */

export type Skin = "pan" | "paper" | "plain";
export type BodyFont = "auto" | "sans" | "serif" | "kai";
export type Voice = "auto" | "plain" | "standard" | "pro";
export type Leading = "auto" | "compact" | "normal" | "airy";
export type Glass = "clear" | "tinted" | "frost" | "off";
export type UpDown = "cn" | "intl";
export type Accent = "gold" | "ice" | "violet";
export type MotionLevel = "auto" | "reduce";
export type Density = "auto" | "full" | "compact";

export interface Prefs {
  skin: Skin;
  font: BodyFont;
  voice: Voice;
  scale: number;
  leading: Leading;
  glass: Glass;
  updown: UpDown;
  accent: Accent;
  motion: MotionLevel;
  loupe: boolean;
  density: Density;
  /** 调仓时现金自动补齐：拖别的资产，差额从现金里出、回到现金里去，合计始终 100% */
  autofill: boolean;
}

export const SCALES = [0.9, 1, 1.1, 1.2, 1.3] as const;
export const DEFAULT_PREFS: Prefs = { skin: "pan", font: "auto", voice: "auto", scale: 1, leading: "auto", glass: "clear", updown: "cn", accent: "gold", motion: "auto", loupe: true, density: "auto", autofill: true };
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
  density: Exclude<Density, "auto">;
}

export const SKINS: SkinMeta[] = [
  { id: "pan", name: "盘口", who: "专业玩家", traits: ["雾蓝档案馆：珍珠玻璃、等宽数字、柔和圆角", "专业工作台：仓位风险 + 真实宏观", "研报体复盘"], font: "sans", voice: "pro", leading: "compact", density: "full" },
  { id: "paper", name: "纸面", who: "一般玩家", traits: ["纸面档案：暖纸圆角、宋体标题、朱红印章段位", "头条像剪报、小道消息像读者来信", "标准复盘"], font: "sans", voice: "standard", leading: "normal", density: "full" },
  { id: "plain", name: "简约", who: "轻松玩", traits: ["轻松留白：大圆角、无边框、圆润数字", "霞鹜文楷；头条、走势和仓位在前，其余折叠", "白话复盘"], font: "kai", voice: "plain", leading: "airy", density: "compact" },
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

/** Apple's two Liquid Glass looks (iOS 26.1 「清透 / 着色」) plus frosted glass and solid. */
export const GLASSES: { id: Glass; name: string; note: string }[] = [
  { id: "clear", name: "清透", note: "苹果液态玻璃的默认样子：几乎不上色，边缘像透镜一样把背后的内容弯进来，只有一道白色镜面高光。" },
  { id: "tinted", name: "着色", note: "同样的透镜边缘，底色加深、模糊更重，文字对比度更高；背景花的时候更好读。" },
  { id: "frost", name: "磨砂", note: "上一代毛玻璃：只模糊不折射，边缘一条细亮线。所有浏览器效果一致。" },
  { id: "off", name: "关闭", note: "实色底。系统开了「降低透明度」时也会自动用这一档。" },
];

/** Accent for the 盘口 skin (buttons, focus rings, highlights); the light skins bring their own. */
export const ACCENTS: { id: Accent; name: string; color: string }[] = [
  { id: "gold", name: "琥珀金", color: "#876329" },
  { id: "ice", name: "冰川蓝", color: "#345f9b" },
  { id: "violet", name: "暮光紫", color: "#7555a4" },
];

export function sanitize(raw: unknown): Prefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Prefs>;
  return {
    skin: r.skin === "paper" || r.skin === "plain" ? r.skin : "pan",
    font: r.font === "sans" || r.font === "serif" || r.font === "kai" ? r.font : "auto",
    voice: r.voice === "plain" || r.voice === "standard" || r.voice === "pro" ? r.voice : "auto",
    scale: (SCALES as readonly number[]).includes(r.scale as number) ? (r.scale as number) : 1,
    leading: r.leading === "compact" || r.leading === "normal" || r.leading === "airy" ? r.leading : "auto",
    glass: r.glass === "tinted" || r.glass === "frost" || r.glass === "off" ? r.glass : "clear",
    updown: r.updown === "intl" ? "intl" : "cn",
    accent: r.accent === "ice" || r.accent === "violet" ? r.accent : "gold",
    motion: r.motion === "reduce" ? "reduce" : "auto",
    loupe: r.loupe !== false,
    density: r.density === "full" || r.density === "compact" ? r.density : "auto",
    autofill: r.autofill !== false,
  };
}

export type Resolved = Omit<Prefs, "font" | "voice" | "leading" | "density"> & {
  font: Exclude<BodyFont, "auto">;
  voice: Exclude<Voice, "auto">;
  leading: Exclude<Leading, "auto">;
  density: Exclude<Density, "auto">;
};

export function resolve(p: Prefs): Resolved {
  const m = skinMeta(p.skin);
  return {
    ...p,
    font: p.font === "auto" ? m.font : p.font,
    voice: p.voice === "auto" ? m.voice : p.voice,
    leading: p.leading === "auto" ? m.leading : p.leading,
    density: p.density === "auto" ? m.density : p.density,
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
  el.dataset.updown = r.updown;
  el.dataset.accent = r.accent;
  el.dataset.motion = r.motion;
  el.dataset.loupe = r.loupe ? "on" : "off";
  el.style.setProperty("--fs", String(r.scale));
  el.style.setProperty("--lh", String(LEADINGS.find((l) => l.id === r.leading)!.value));
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", r.skin === "pan" ? "#eaf0f5" : r.skin === "paper" ? "#F6F4EF" : "#FAFAF7");
}

