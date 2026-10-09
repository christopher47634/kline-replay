import { CARDS_PER_GAME, type Guess, type PreparedEvent } from "./types";

export const BUCKET_LABELS = ["< −10%", "−10% ~ −3%", "±3% 以内", "+3% ~ +10%", "> +10%"] as const;

/** The 20-day move after the event day, and which magnitude bucket it falls in. */
export function outcome(ev: Pick<PreparedEvent, "before" | "after">) {
  const ret = ev.after[ev.after.length - 1] / ev.before[ev.before.length - 1] - 1;
  return { ret, up: ret > 0, bucket: bucketOf(ret) };
}

export function bucketOf(ret: number): number {
  if (ret < -0.1) return 0;
  if (ret < -0.03) return 1;
  if (ret <= 0.03) return 2;
  if (ret <= 0.1) return 3;
  return 4;
}

export const POINTS = { direction: 10, bucket: 5, streakBonus: 2, streakFrom: 3 } as const;

export interface CardScore {
  dirOk: boolean;
  bucketOk: boolean;
  /** Streak bonus applied to this card. */
  bonus: number;
  points: number;
  /** Consecutive correct directions ending at this card. */
  streak: number;
}

/** Direction right +10; magnitude right +5; from the 3rd correct direction in a row, +2 each. */
export function scoreCard(guess: Guess, ret: number, streakBefore: number): CardScore {
  const dirOk = guess.up === ret > 0;
  const bucketOk = guess.bucket !== null && guess.bucket === bucketOf(ret);
  const streak = dirOk ? streakBefore + 1 : 0;
  const bonus = dirOk && streak >= POINTS.streakFrom ? POINTS.streakBonus : 0;
  const points = (dirOk ? POINTS.direction : 0) + (bucketOk ? POINTS.bucket : 0) + bonus;
  return { dirOk, bucketOk, bonus, points, streak };
}

export interface GameScore {
  cards: CardScore[];
  total: number;
  /** Best possible with this mode (magnitude round on/off). */
  max: number;
}

export function maxScore(withBucket: boolean, n = CARDS_PER_GAME): number {
  const streakCards = Math.max(0, n - (POINTS.streakFrom - 1));
  return n * (POINTS.direction + (withBucket ? POINTS.bucket : 0)) + streakCards * POINTS.streakBonus;
}

export function scoreGame(rets: number[], guesses: Guess[]): GameScore {
  let streak = 0;
  const cards = guesses.map((g, i) => {
    const s = scoreCard(g, rets[i], streak);
    streak = s.streak;
    return s;
  });
  return { cards, total: cards.reduce((a, c) => a + c.points, 0), max: maxScore(guesses.some((g) => g.bucket !== null), guesses.length) };
}

export interface EventTitle {
  label: string;
  desc: string;
  color: string;
}

/**
 * Titles follow the spec's 130/100/70/40 out of 150, expressed as a share of the best possible score
 * so the basic (direction only) mode can earn every title too.
 */
export const TITLE_CUTS = [0.78, 0.6, 0.42, 0.24] as const;

export function titleOf(total: number, max: number): EventTitle {
  const r = max ? total / max : 0;
  if (r >= TITLE_CUTS[0]) return { label: "市场先知", desc: "你好像看过这一页历史", color: "#876329" };
  if (r >= TITLE_CUTS[1]) return { label: "老江湖", desc: "见过风浪，心里有数", color: "#bc3e49" };
  if (r >= TITLE_CUTS[2]) return { label: "有点感觉", desc: "一半靠功力，一半靠运气", color: "#a35b20" };
  if (r >= TITLE_CUTS[3]) return { label: "随机漫步", desc: "抛硬币也能考出这个分", color: "#52677b" };
  return { label: "反向指标", desc: "别人买你卖，别人卖你买", color: "#277454" };
}

/** Fisher–Yates over the playable cards, with an injectable random source for tests. */
export function pickCards<T>(pool: T[], n = CARDS_PER_GAME, rand: () => number = Math.random): T[] {
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}

/**
 * Cards for a new game: never-seen first, then ones this device got wrong before, then the rest (each group shuffled).
 * Repeats are fine as practice; they are labelled as such instead of passing for a fresh test.
 */
export function pickFresh<T extends { id: string }>(pool: T[], seen: Record<string, "ok" | "miss">, n = CARDS_PER_GAME, rand: () => number = Math.random): T[] {
  const group = (f: (x: T) => boolean) => pickCards(pool.filter(f), pool.length, rand);
  return [...group((x) => !seen[x.id]), ...group((x) => seen[x.id] === "miss"), ...group((x) => seen[x.id] === "ok")].slice(0, Math.min(n, pool.length));
}
