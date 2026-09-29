import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { notFound } from "next/navigation";
import { PERSONAS } from "@/game/persona";
import type { PersonaId } from "@/game/types";
import { boardEnabled, supabase, type ScoreRow } from "@/lib/board";
import { pct, upDownColor } from "@/lib/format";
import { getScript } from "@/lib/scripts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "排行榜 · 穿越 K 线" };

export default async function Board({ params }: { params: Promise<{ script: string }> }) {
  const { script: id } = await params;
  const script = getScript(id);
  if (!script) notFound();
  let rows: Pick<ScoreRow, "nickname" | "ret" | "persona" | "created_at">[] = [];
  let error = false;
  const db = supabase();
  if (db) {
    const res = await db.from("scores").select("nickname, ret, persona, created_at").eq("script_id", id).order("ret", { ascending: false }).limit(50);
    rows = res.data ?? [];
    error = Boolean(res.error);
  }
  return (
    <main className="mx-auto max-w-[760px] px-4 py-12">
      <Link href="/" className="text-sm text-sub hover:text-ink">
        ← 回首页
      </Link>
      <Reveal as="h1" className="mt-4 font-display text-h1">{`${script.title} · 排行榜`}</Reveal>
      {!boardEnabled() ? (
        <p className="mt-6 text-sub">排行榜暂未开放。</p>
      ) : error ? (
        <p className="mt-6 text-up">排行榜读取失败，稍后再试。</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sub">还没有人上榜。玩一局，做第一个。</p>
      ) : (
        <table className="mt-6 w-full text-sm">
          <thead className="text-sub text-left">
            <tr>
              <th className="py-2 font-normal">排名</th>
              <th className="py-2 font-normal">昵称</th>
              <th className="py-2 font-normal text-right">收益</th>
              <th className="py-2 font-normal pl-4">人格</th>
              <th className="py-2 font-normal text-right hidden sm:table-cell">时间</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className="board-row border-t border-line"
                style={{
                  animationDelay: `${Math.min(i, 8) * 40}ms`,
                  boxShadow: i < 3 ? `inset 4px 0 0 ${["#F5B400", "#C0C6CF", "#B87333"][i]}` : undefined,
                  background: i < 3 ? `linear-gradient(90deg, ${["rgb(245 180 0 / 0.08)", "rgb(192 198 207 / 0.06)", "rgb(184 115 51 / 0.07)"][i]}, transparent 60%)` : undefined,
                }}
              >
                <td className="py-2.5 num text-sub">{i + 1}</td>
                <td className="py-2.5">{r.nickname}</td>
                <td className={`py-2.5 num text-right font-bold ${upDownColor(Number(r.ret))}`}>{pct(Number(r.ret))}</td>
                <td className="py-2.5 pl-4">{PERSONAS[r.persona as PersonaId]?.title ?? r.persona}</td>
                <td className="py-2.5 num text-right text-sub hidden sm:table-cell">{new Date(r.created_at).toLocaleDateString("zh-CN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
