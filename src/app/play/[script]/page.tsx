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
  const { script } = await params;
  if (!getScript(script)) notFound();
  return <GameView scriptId={script} />;
}
