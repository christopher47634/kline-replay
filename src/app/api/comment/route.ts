import { NextResponse } from "next/server";
import { allocText, templateComment, type CommentRequest } from "@/lib/comment";
import { getScript } from "@/lib/scripts";
import { pct } from "@/lib/format";

const cache = new Map<string, { text: string; at: number }>();
const TTL = 60_000;

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
  let req: CommentRequest;
  try {
    req = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const script = getScript(String(req.scriptId));
  const month = script?.months[req.month];
  if (!script || !month || !req.allocAfter) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const key = `${req.scriptId}:${req.month}:${JSON.stringify(req.allocAfter)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ text: hit.text, cached: true });

  let text: string | null = null;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (apiKey) {
    const r = month.returns;
    const summary = `大盘${pct(month.marketReturn)}，上证50 ${pct(r.sh50)}，创业板 ${pct(r.cyb)}，银行 ${pct(r.bank)}，白酒 ${pct(r.baijiu)}`;
    try {
      text = await askLLM(prompt(req, summary), apiKey);
    } catch {
      text = null; // timeout or network error: fall through to the template
    }
  }
  const source = text ? "llm" : "template";
  text ??= templateComment(req);
  cache.set(key, { text, at: Date.now() });
  return NextResponse.json({ text, source });
}
