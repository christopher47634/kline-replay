import { NextResponse } from "next/server";
import { decodeGame } from "@/game/encode";
import { playAll, totalReturn } from "@/game/engine";
import { judgePersona } from "@/game/persona";
import { cleanNickname, supabase } from "@/lib/board";
import { getScript } from "@/lib/scripts";

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
  const db = supabase();
  if (!db) return NextResponse.json({ error: "排行榜未开启" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { encoded?: string; nickname?: string; ret?: number };
  const nickname = cleanNickname(body.nickname);
  if (!nickname) return NextResponse.json({ error: "昵称需为 1–8 个字，且不能含敏感词" }, { status: 400 });
  const decoded = decodeGame(body.encoded);
  const script = decoded.ok ? getScript(decoded.scriptId) : null;
  if (!decoded.ok || !script) return NextResponse.json({ error: "结果链接无效" }, { status: 400 });
  // Never trust the client number: recompute from the encoded allocations.
  const history = playAll(script, decoded.allocs);
  const ret = totalReturn(script, history);
  if (typeof body.ret !== "number" || Math.abs(body.ret - ret) > 1e-6) return NextResponse.json({ error: "收益与链接不一致" }, { status: 400 });
  const persona = judgePersona(history, script);
  const { error } = await db.from("scores").insert({ script_id: script.id, nickname, ret, persona, encoded: body.encoded });
  if (error) return NextResponse.json({ error: "写入失败" }, { status: 502 });
  const { count } = await db.from("scores").select("id", { count: "exact", head: true }).eq("script_id", script.id).gt("ret", ret);
  return NextResponse.json({ ok: true, rank: (count ?? 0) + 1 });
}
