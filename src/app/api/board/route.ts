import { NextResponse } from "next/server";
import { decodeGame, encodeGame } from "@/game/encode";
import { playAll, totalReturn } from "@/game/engine";
import { judgePersona } from "@/game/persona";
import { boardEnabled, cleanNickname, supabase, supabaseWriter } from "@/lib/board";
import { clientIp, createRateLimiter } from "@/lib/rateLimit";
import { getScript } from "@/lib/scripts";

const allowPost = createRateLimiter(10, 60_000);

export async function GET(request: Request) {
  const script = new URL(request.url).searchParams.get("script") ?? "2015";
  const db = supabase();
  if (!db) return NextResponse.json({ enabled: false, rows: [], count: 0 });
  const [{ data, error }, { count }] = await Promise.all([
    db.from("scores").select("nickname, ret, persona, created_at").eq("script_id", script).order("ret", { ascending: false }).limit(50),
    db.from("scores").select("id", { count: "exact", head: true }).eq("script_id", script),
  ]);
  if (error) return NextResponse.json({ enabled: true, rows: [], count: 0, error: "读取失败" }, { status: 502 });
  return NextResponse.json({ enabled: true, rows: data, count: count ?? data.length });
}

export async function POST(request: Request) {
  if (!boardEnabled()) return NextResponse.json({ error: "排行榜未开启" }, { status: 404 });
  const db = supabaseWriter();
  if (!db) {
    console.warn("[board] SUPABASE_SERVICE_ROLE_KEY 未配置，排行榜处于只读状态，已拒绝提交");
    return NextResponse.json({ error: "排行榜暂不接受提交" }, { status: 503 });
  }
  if (!allowPost(clientIp(request))) return NextResponse.json({ error: "提交太频繁，稍后再试" }, { status: 429 });
  const raw: unknown = await request.json().catch(() => null);
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  const body = raw as { encoded?: unknown; nickname?: unknown; ret?: unknown };
  const nickname = cleanNickname(body.nickname);
  if (!nickname) return NextResponse.json({ error: "昵称需为 1–8 个字，且不能含敏感词" }, { status: 400 });
  const encoded = typeof body.encoded === "string" ? body.encoded : null;
  const decoded = decodeGame(encoded);
  const script = encoded && decoded.ok ? getScript(decoded.scriptId) : null;
  if (!encoded || !decoded.ok || !script) return NextResponse.json({ error: "结果链接无效" }, { status: 400 });
  // Never trust the client number: recompute from the encoded allocations.
  const history = playAll(script, decoded.allocs);
  const ret = totalReturn(script, history);
  if (typeof body.ret !== "number" || !Number.isFinite(body.ret) || Math.abs(body.ret - ret) > 1e-6) return NextResponse.json({ error: "收益与链接不一致" }, { status: 400 });
  // 存规范编码：末尾多余的位不同也算同一份结果，唯一约束才挡得住
  const canonical = encodeGame(script.id, decoded.allocs);
  const persona = judgePersona(history, script);
  const { error } = await db.from("scores").insert({ script_id: script.id, nickname, ret, persona, encoded: canonical });
  // 唯一约束 (script_id, encoded)：同一份结果只能上榜一次
  if (error?.code === "23505") return NextResponse.json({ error: "这份结果已经上榜了" }, { status: 409 });
  if (error) return NextResponse.json({ error: "写入失败" }, { status: 502 });
  const { count } = await db.from("scores").select("id", { count: "exact", head: true }).eq("script_id", script.id).gt("ret", ret);
  return NextResponse.json({ ok: true, rank: (count ?? 0) + 1 });
}
