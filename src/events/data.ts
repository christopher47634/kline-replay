// Server-only: slices the long price series into per-event windows. Import it from server components
// (pages) and pass the result to client components as props, so the ~350 KB of history never ships to the browser.
import aShare from "../../content/events/a-share-classics.json";
import global from "../../content/events/global-black-swans.json";
import marketLong from "../../content/data/prices/market_long.json";
import spxLong from "../../content/data/prices/spx_long.json";
import type { EventDeck, PreparedDeck, PreparedEvent } from "./types";

/** Deck order matters: the position is the deck number stored in share links. Only append. */
const RAW = [aShare, global] as unknown as EventDeck[];
export const DECK_IDS = RAW.map((d) => d.id);

const SERIES = {
  market: { name: "上证综指", rows: marketLong.rows as [string, number][] },
  spx: { name: "标普 500", rows: spxLong.rows as [string, number][] },
} as const;

const BEFORE = 60;
const AFTER = 20;

export function deckNumber(id: string): number {
  return DECK_IDS.indexOf(id);
}

export function prepareDeck(id: string): PreparedDeck | null {
  const deck = RAW.find((d) => d.id === id);
  if (!deck) return null;
  const { name, rows } = SERIES[deck.index];
  const available = rows.length > BEFORE + AFTER;
  const all: PreparedEvent[] = [];
  deck.events.forEach((ev, index) => {
    if (!available) return;
    // An event dated on a non-trading day slides to the next trading day (validate_events.py warns about it).
    let i = rows.findIndex(([d]) => d >= ev.date);
    if (i < 0) i = rows.length - 1;
    if (i < BEFORE - 1 || i + AFTER >= rows.length) return;
    all[index] = {
      ...ev,
      index,
      before: rows.slice(i - BEFORE + 1, i + 1).map((r) => r[1]),
      after: rows.slice(i + 1, i + AFTER + 1).map((r) => r[1]),
    };
  });
  return {
    id: deck.id,
    title: deck.title,
    indexName: name,
    available: available && all.some(Boolean),
    events: all.filter((e): e is PreparedEvent => Boolean(e) && e.verify),
    all,
  };
}

export function allDecks(): PreparedDeck[] {
  return DECK_IDS.map((id) => prepareDeck(id)!);
}
