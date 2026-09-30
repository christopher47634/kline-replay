import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameView } from "@/components/game/GameView";
import { getScript, SCRIPT_IDS } from "@/lib/scripts";

export function generateStaticParams() {
  return SCRIPT_IDS.map((script) => ({ script }));
}

export async function generateMetadata({ params }: { params: Promise<{ script: string }> }): Promise<Metadata> {
  const s = getScript((await params).script);
  return { title: s ? `${s.title} · 穿越 K 线` : "剧本不存在 · 穿越 K 线" };
}

export default async function PlayPage({ params }: { params: Promise<{ script: string }> }) {
  const s = getScript((await params).script);
  if (!s) notFound();
  // only this year's data goes to the client (six years bundled together would add ~45 KB to every page)
  return <GameView script={s} />;
}
