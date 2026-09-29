"use client";

import type { RoundRecord, Script } from "@/game/types";
import { pct } from "./format";

export function blocks(history: RoundRecord[]): string {
  return history.map((h) => (h.liquidated ? "🟪" : h.pnl >= 0 ? "🟥" : "🟩")).join("");
}

export function shareText(opts: { script: Script; history: RoundRecord[]; ret: number; rankLabel: string; personaTitle: string; quote: string; origin: string }): string {
  const { script, history, ret, rankLabel, personaTitle, quote, origin } = opts;
  return [
    `穿越 K 线 · ${script.title.replace("：", " ")}`,
    blocks(history),
    `收益 ${pct(ret)} ｜ ${rankLabel} ｜ ${personaTitle}`,
    `“${quote}”`,
    `还能听见这一年 🎧`,
    `来挑战 → ${origin}/play/${script.id}`,
  ].join("\n");
}

/** Clipboard with a textarea fallback for WeChat / older WebViews. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export async function exportPng(node: HTMLElement, filename: string, width: number, height: number): Promise<void> {
  const { toPng } = await import("html-to-image");
  const url = await toPng(node, { width, height, pixelRatio: 1, cacheBust: true, backgroundColor: "#07090D" });
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
