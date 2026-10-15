import { ASSET_IDS, type Allocation } from "./types";

/** 两份仓位是否逐项相同（store / replay / compose 共用）。 */
export const sameAlloc = (a: Allocation, b: Allocation) => (Object.keys(a) as (keyof Allocation)[]).every((k) => a[k] === b[k]);

/**
 * 运行时校验：来自网络或本地存档的值是否是一份合法仓位（六项都是 0–100 的整数，合计 100）。
 * 不要求 5 的倍数：引擎本身也不要求，编码层才限制步长。
 */
export function isAllocation(x: unknown): x is Allocation {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  let sum = 0;
  for (const id of ASSET_IDS) {
    const v = o[id];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 100) return false;
    sum += v;
  }
  return sum === 100;
}
