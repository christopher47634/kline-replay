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

export function shortMonth(label: string): string {
  return label.replace(/^\d+ 年 /, "");
}
