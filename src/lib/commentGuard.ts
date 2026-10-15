import { isAllocation } from "@/game/alloc";
import { getScript } from "@/lib/scripts";
import type { CommentRequest } from "@/lib/comment";

/**
 * 校验 /api/comment 的请求体：任何不合格都返回 null（路由回 400），绝不抛错。
 * month 必须是剧本内的整数下标，allocAfter / allocBefore 必须是合法仓位。
 */
export function parseCommentRequest(body: unknown): CommentRequest | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.scriptId !== "string") return null;
  const script = getScript(b.scriptId);
  if (!script) return null;
  if (typeof b.month !== "number" || !Number.isInteger(b.month) || b.month < 0 || b.month >= script.months.length) return null;
  if (!isAllocation(b.allocAfter)) return null;
  if (b.allocBefore !== null && !isAllocation(b.allocBefore)) return null;
  if (typeof b.pnl !== "number" || !Number.isFinite(b.pnl)) return null;
  if (typeof b.marketReturn !== "number" || !Number.isFinite(b.marketReturn)) return null;
  return { scriptId: b.scriptId, month: b.month, allocBefore: b.allocBefore, allocAfter: b.allocAfter, pnl: b.pnl, marketReturn: b.marketReturn };
}
