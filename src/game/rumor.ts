import type { Allocation, Script } from "./types";

/**
 * 小道消息复盘：三件事分开回答，不混成一句「信对了」——
 * 消息有没有成真（世界的事实）、它指的方向本月有没有走出来（价格的事实）、你有没有照着它调仓（你的事实）。
 */
export function rumorFacts(script: Script, last: { month: number; alloc: Allocation; allocBefore: Allocation | null }) {
  const m = script.months[last.month];
  const call = m.rumorCall ?? null;
  const name = (id: string) => (id === "market" ? "大盘" : script.assets.find((a) => a.id === id)?.name ?? id);
  const came = m.rumorIsSignal;
  if (!call) return { came, call: null, ret: null, same: null, acted: null as null | "with" | "against" | "none", target: null as string | null };
  const ret = call.asset === "market" ? m.marketReturn : m.returns[call.asset];
  const before = last.allocBefore;
  const exposure = (a: typeof last.alloc) => 100 - a.cash;
  const d = call.asset === "market" ? exposure(last.alloc) - (before ? exposure(before) : 0) : last.alloc[call.asset] - (before?.[call.asset] ?? 0);
  const acted = d === 0 ? "none" : Math.sign(d) === call.dir ? "with" : "against";
  return { came, call, ret, same: Math.sign(ret) === call.dir, acted: acted as "with" | "against" | "none", target: name(call.asset) };
}
