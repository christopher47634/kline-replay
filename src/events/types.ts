/** One historical-event card, as authored in content/events/{deck}.json. */
export interface EventCard {
  id: string;
  /** Event day (a trading day). The player guesses the 20 trading days after it. */
  date: string;
  title: string;
  context: string;
  hindsight: string;
  tags: string[];
  /** 1 easy, 2 medium, 3 hard (the aftermath went against the day's move). */
  difficulty: 1 | 2 | 3;
  /** Only verified cards are played. */
  verify: boolean;
  note?: string;
}

export interface EventDeck {
  id: string;
  title: string;
  /** Which long series the deck reads: Shanghai Composite or S&P 500. */
  index: "market" | "spx";
  events: EventCard[];
}

/** An event with its price slices, computed on the server from the long series. */
export interface PreparedEvent extends EventCard {
  /** Closes of the 60 trading days up to and including the event day. */
  before: number[];
  /** Closes of the 20 trading days after the event day. */
  after: number[];
  /** Index in the deck's full `events` array (stable, used in share links). */
  index: number;
}

export interface PreparedDeck {
  id: string;
  title: string;
  indexName: string;
  available: boolean;
  /** Playable (verified) events only. */
  events: PreparedEvent[];
  /** All events incl. unverified, by original index, so old links keep decoding. */
  all: PreparedEvent[];
}

/** Player's answer to one card. `bucket` is null when the magnitude round is off. */
export interface Guess {
  up: boolean;
  bucket: number | null;
}

export const CARDS_PER_GAME = 10;
