import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameView } from "@/components/game/GameView";
import { blindScript, mysterySlug } from "@/lib/blind";
import { getScript, SCRIPT_IDS } from "@/lib/scripts";

// 盲盒模式: /mystery/<opaque slug> plays one of the years with everything that names it masked.
export function generateStaticParams() {
  return SCRIPT_IDS.map((id) => ({ slug: mysterySlug(id) }));
}

export const metadata: Metadata = { title: "盲盒模式 · 穿越 K 线" };

export default async function MysteryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = SCRIPT_IDS.find((y) => mysterySlug(y) === slug);
  const script = id ? getScript(id) : null;
  if (!script) notFound();
  return <GameView script={blindScript(script)} />;
}
