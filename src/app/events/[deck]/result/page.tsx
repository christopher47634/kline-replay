import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventResult } from "@/components/events/EventResult";
import { deckNumber, prepareDeck } from "@/events/data";

type Props = { params: Promise<{ deck: string }>; searchParams: Promise<{ s?: string }> };

export const metadata: Metadata = { title: "战绩 · 大事件猜涨跌" };

export default async function EventResultPage({ params, searchParams }: Props) {
  const id = (await params).deck;
  const deck = prepareDeck(id);
  if (!deck || !deck.available) notFound();
  const s = (await searchParams).s ?? "";
  return <EventResult deck={deck} deckNo={deckNumber(id)} code={s} />;
}
