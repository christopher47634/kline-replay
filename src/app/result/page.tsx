import type { Metadata } from "next";
import { ResultView } from "@/components/result/ResultView";
import { decodeGame } from "@/game/encode";
import { playAll, totalReturn } from "@/game/engine";
import { boardEnabled } from "@/lib/board";
import { pct } from "@/lib/format";
import { getScript } from "@/lib/scripts";

type Props = { searchParams: Promise<{ s?: string; play?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const s = (await searchParams).s ?? "";
  const d = decodeGame(s);
  const script = d.ok ? getScript(d.scriptId) : null;
  if (!d.ok || !script) return { title: "链接无效 · 穿越 K 线" };
  const ret = totalReturn(script, playAll(script, d.allocs));
  const title = ret >= 0 ? `我在 ${script.id} 年赚了 ${pct(ret).slice(1)}，你呢？` : `我在 ${script.id} 年亏了 ${pct(ret).slice(1)}，你呢？`;
  const image = `/api/og?s=${encodeURIComponent(s)}`;
  return {
    title,
    description: "穿越 K 线：用真实行情重玩一年，结算投资人格，还能听见这一年。",
    openGraph: { title, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [image] },
  };
}

export default async function ResultPage({ searchParams }: Props) {
  const sp = await searchParams;
  const d = decodeGame(sp.s ?? "");
  return <ResultView code={sp.s ?? ""} script={d.ok ? getScript(d.scriptId) : null} boardOn={boardEnabled()} openMusic={sp.play === "1"} />;
}
