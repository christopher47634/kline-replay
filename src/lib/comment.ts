import comments from "../../content/comments.json";
import type { Allocation } from "@/game/types";

export interface CommentRequest {
  scriptId: string;
  month: number;
  allocBefore: Allocation | null;
  allocAfter: Allocation;
  pnl: number;
  marketReturn: number;
}

const risky = (a: Allocation | null) => (a ? 100 - a.cash : 0);

/** (market up/down) x (player add/cut/hold) x (win/lose) -> one of the 12 template buckets. */
export function commentBucket(req: CommentRequest): keyof typeof comments {
  const mkt = req.marketReturn >= 0 ? "up" : "down";
  const d = risky(req.allocAfter) - risky(req.allocBefore);
  const act = d > 5 ? "add" : d < -5 ? "cut" : "hold";
  const res = req.pnl >= 0 ? "win" : "lose";
  return `${mkt}_${act}_${res}` as keyof typeof comments;
}

export function templateComment(req: CommentRequest, seed = Date.now()): string {
  const list = comments[commentBucket(req)];
  return list[Math.abs(Math.floor(seed)) % list.length];
}

export function allocText(a: Allocation | null): string {
  if (!a) return "空仓（全部现金）";
  const names: Record<keyof Allocation, string> = { sh50: "上证50", cyb: "创业板", bank: "银行", baijiu: "白酒", cash: "现金", margin: "融资杠杆" };
  return (Object.keys(names) as (keyof Allocation)[])
    .filter((k) => a[k] > 0)
    .map((k) => `${names[k]}${a[k]}%`)
    .join("、");
}

/** Client call with 1.5 s budget; any failure falls back to a local template so the game never stalls. */
export async function fetchComment(req: CommentRequest, timeoutMs = 1500): Promise<string> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch("/api/comment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(String(res.status));
    const { text } = (await res.json()) as { text?: string };
    if (!text) throw new Error("empty");
    return text;
  } catch {
    return templateComment(req, req.month * 7 + Math.round(req.pnl * 1000));
  } finally {
    clearTimeout(timer);
  }
}
