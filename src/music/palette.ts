/**
 * Canvas charts cannot use CSS variables directly: read the current skin's tokens (skins.css / themes.css) when
 * drawing, so the 大事件 chart and the music visual follow 盘口 / 纸面 / 简约 like everything else.
 * Falls back to the dark 盘口 values outside the browser.
 */
export interface Palette {
  bg: string;
  hatchBg: string;
  hatch: string;
  grid: string;
  sub: string;
  ink: string;
  gray: string;
  gold: string;
  up: string;
  down: string;
  /** the moving dot's fill */
  dot: string;
}

const DARK: Palette = { bg: "#eaf0f5", hatchBg: "#e2eaf1", hatch: "#d3dee7", grid: "#d3dee7", sub: "#52677b", ink: "#213448", gray: "#64768b", gold: "#876329", up: "#bc3e49", down: "#277454", dot: "#fff" };

let cache: { key: string; pal: Palette } | null = null;

export function palette(): Palette {
  if (typeof document === "undefined") return DARK;
  const root = document.documentElement;
  const key = `${root.dataset.skin}|${root.dataset.updown}|${root.dataset.accent}`;
  if (cache?.key === key) return cache.pal;
  const css = getComputedStyle(root);
  const v = (name: string, fb: string) => css.getPropertyValue(name).trim() || fb;
  const light = root.dataset.skin === "paper" || root.dataset.skin === "plain";
  const pal: Palette = {
    bg: v("--color-card", DARK.bg),
    hatchBg: v("--color-elev", DARK.hatchBg),
    hatch: v("--color-line", DARK.hatch),
    grid: v("--color-line", DARK.grid),
    sub: v("--color-sub", DARK.sub),
    ink: v("--color-ink", DARK.ink),
    gray: v("--color-market", DARK.gray),
    gold: v("--color-gold", DARK.gold),
    up: v("--color-up", DARK.up),
    down: v("--color-down", DARK.down),
    dot: light ? v("--color-card", "#fff") : "#fff",
  };
  cache = { key, pal };
  return pal;
}
