/*
 * 事件模式：这台设备答过哪些题（只存题目 id 和对错）。用来先抽没见过的题，并把重复题标成「复盘练习」。
 */
const key = (deck: string) => `kline:events-seen:${deck}`;

export function seenMap(deck: string): Record<string, "ok" | "miss"> {
  try {
    const v = JSON.parse(localStorage.getItem(key(deck)) ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function recordSeen(deck: string, id: string, ok: boolean) {
  try {
    const m = seenMap(deck);
    m[id] = ok ? "ok" : "miss";
    localStorage.setItem(key(deck), JSON.stringify(m));
  } catch {
    /* private mode: every card counts as new */
  }
}

/** 进阶模式的幅度：先选方向，再选「涨 / 跌 多少」，只给和方向一致的三档（BUCKET_LABELS 的下标，打分规则不变）。 */
export const MAGNITUDE_LABELS = ["3% 以内", "3% ~ 10%", "10% 以上"] as const;
export const bucketsFor = (up: boolean) => (up ? [2, 3, 4] : [2, 1, 0]);
