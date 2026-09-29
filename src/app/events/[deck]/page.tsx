import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventGame } from "@/components/events/EventGame";
import { DECK_IDS, deckNumber, prepareDeck } from "@/events/data";

type Props = { params: Promise<{ deck: string }> };

export function generateStaticParams() {
  return DECK_IDS.map((deck) => ({ deck }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const deck = prepareDeck((await params).deck);
  return { title: deck ? `${deck.title} · 大事件猜涨跌` : "大事件猜涨跌" };
}

export default async function EventDeckPage({ params }: Props) {
  const id = (await params).deck;
  const deck = prepareDeck(id);
  if (!deck || !deck.available) notFound();
  return <EventGame deck={deck} deckNo={deckNumber(id)} />;
}
