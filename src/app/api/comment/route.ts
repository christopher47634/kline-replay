import { NextResponse } from "next/server";
import { allocText, templateComment, type CommentRequest } from "@/lib/comment";
import { parseCommentRequest } from "@/lib/commentGuard";
import { getScript } from "@/lib/scripts";
import { pct } from "@/lib/format";
import { LruCache } from "@/lib/lruCache";
import { clientIp, createRateLimiter } from "@/lib/rateLimit";
import { ASSET_IDS } from "@/game/types";

const TTL = 60_000;
// 缓存有上限（避免被不同仓位撑爆内存）；限流按 IP，每分钟 30 次（正常玩一局只会点评 12 次）
const CACHE_MAX = 500;
const cache = new LruCache<{ text: string; source: string }>(CACHE_MAX, TTL);
const allow = createRateLimiter(30, 60_000);

function prompt(req: CommentRequest, marketSummary: string) {
  return `你是一个炒股二十年、嘴碎但不刻薄的老股民。
本月市场：${marketSummary}
玩家上月仓位：${allocText(req.allocBefore)}；本月仓位：${allocText(req.allocAfter)}；本月盈亏：${pct(req.pnl)}
用一句 ≤ 30 字的话点评玩家这个月的操作。可以调侃，不给任何买卖建议，不出现"应该""建议"。只输出这句话。`;
}

async function askLLM(text: string, key: string): Promise<string | null> {
  const base = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [{ role: "user", content: text }],
      temperature: 0.8,
      max_tokens: 60,
    }),
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const out: string | undefined = json?.choices?.[0]?.message?.content?.trim();
  if (!out || out.length > 40 || /应该|建议/.test(out)) return null;
  return out.replace(/^["“]|["”]$/g, "");
}

export async function POST(request: Request) {
  if (!allow(clientIp(request))) return NextResponse.json({ error: "too many requests" }, { status: 429 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const req: CommentRequest | null = parseCommentRequest(body);
  const script = req ? getScript(req.scriptId) : null;
  const month = req && script ? script.months[req.month] : null;
  if (!req || !script || !month) return NextResponse.json({ error: "bad request" }, { status: 400 });

  // 键里的仓位按固定顺序展开，不受 JSON 字段顺序影响
  const key = `${req.scriptId}:${req.month}:${ASSET_IDS.map((id) => req.allocAfter[id]).join(",")}`;
  const hit = cache.get(key);
  if (hit) return NextResponse.json({ text: hit.text, cached: true });

  let text: string | null = null;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (apiKey) {
    try {
      const r = month.returns;
      const summary = `大盘${pct(month.marketReturn)}，上证50 ${pct(r.sh50)}，创业板 ${pct(r.cyb)}，银行 ${pct(r.bank)}，白酒 ${pct(r.baijiu)}`;
      text = await askLLM(prompt(req, summary), apiKey);
    } catch {
      text = null; // timeout or network error: fall through to the template
    }
  }
  const source = text ? "llm" : "template";
  text ??= templateComment(req);
  cache.set(key, { text, source });
  return NextResponse.json({ text, source });
}
