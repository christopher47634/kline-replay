export function yuan(x: number): string {
  return `¥ ${Math.round(x).toLocaleString("en-US")}`;
}

/** Signed percent with one decimal, e.g. +3.2% / -0.8%. */
export function pct(x: number, digits = 1): string {
  const v = x * 100;
  const s = Math.abs(v) < 0.05 ? 0 : v;
  return `${s > 0 ? "+" : s < 0 ? "−" : ""}${Math.abs(s).toFixed(digits)}%`;
}

/** Percentage points between two returns, unsigned, one decimal. */
export function pp(a: number, b: number): string {
  return `${Math.abs((a - b) * 100).toFixed(1)}`;
}

export const upDownColor = (x: number) => (x > 0 ? "text-up" : x < 0 ? "text-down" : "text-sub");
export const upDownHex = (x: number) => (x > 0 ? "#bc3e49" : x < 0 ? "#277454" : "#52677b");

/** Badge/persona hues retain their identity; dark surfaces add luminance, light surfaces leave them unchanged. */
export const themeTone = (hex: string) => `color-mix(in srgb, ${hex}, white var(--tone-lift, 0%))`;

/** Server-rendered previews cannot resolve the page's CSS variables. */
export const nightTone = (hex: string) => `#${hex.slice(1).match(/.{2}/g)!.map(c => Math.round(parseInt(c, 16) * 0.56 + 255 * 0.44).toString(16).padStart(2, "0")).join("")}`;

export function shortMonth(label: string): string {
  return label.replace(/^\d+ 年 /, "");
}
