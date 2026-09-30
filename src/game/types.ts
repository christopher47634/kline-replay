export const ASSET_IDS = ["sh50", "cyb", "bank", "baijiu", "cash", "margin"] as const;
export type AssetId = (typeof ASSET_IDS)[number];
/** Integer percentages in steps of 5, summing to 100. */
export type Allocation = Record<AssetId, number>;

export const TRADED_IDS = ["sh50", "cyb", "bank", "baijiu"] as const;
export type TradedId = (typeof TRADED_IDS)[number];

export interface DailyBar {
  date: string;
  r: Record<TradedId | "market", number>;
}

import type { Moment } from "./moment";

export type Tone = "bull" | "bear" | "neutral";

export interface Headline {
  text: string;
  outlet: string;
  /** Day of the previous month the item ran (headlines are already-known news). */
  day: number;
  tone: Tone;
}

export interface ScriptMonth {
  index: number;
  label: string;
  headlines: Headline[];
  rumor: string;
  rumorIsSignal: boolean;
  hindsight: string;
  /** Optional historical-moment card shown before this round. */
  moment?: Moment;
  marketReturn: number;
  returns: Record<AssetId, number>;
  daily: DailyBar[];
}

/** A month before the game starts (previous Nov/Dec), shown as chart context. */
export interface PreMonth {
  label: string;
  marketReturn: number;
  returns: Record<TradedId, number>;
  daily: DailyBar[];
}

export interface ScriptParams {
  cashMonthly: number;
  marginLeverage: number;
  marginCostMonthly: number;
  marginLiquidation: number;
}

export interface ScriptAsset {
  id: AssetId;
  name: string;
  risk: string;
  desc: string;
}

export interface Script {
  id: string;
  title: string;
  subtitle: string;
  intro: string;
  startCash: number;
  /** SSE Composite close before the year starts (blind mode rescales point levels to 起点 = 100) */
  baseClose?: number;
  /** 盲盒模式: a masked copy of a real script (lib/blind.ts); the year is revealed on the result page */
  blind?: boolean;
  peakMonth: number;
  troughMonth: number;
  assets: ScriptAsset[];
  params: ScriptParams;
  preMonths: PreMonth[];
  months: ScriptMonth[];
  benchmarks: { allInMarket: number; allCash: number; retailAvg: number; retailAvgNote: string };
  sources: { label: string; url: string }[];
}

export interface RoundRecord {
  month: number;
  alloc: Allocation;
  cashBefore: number;
  cashAfter: number;
  pnl: number;
  liquidated: boolean;
}

export interface GameState {
  scriptId: string;
  month: number;
  cash: number;
  history: RoundRecord[];
  finished: boolean;
}

export interface SettleResult {
  cashAfter: number;
  pnl: number;
  liquidated: boolean;
  /** Value of each bucket after the month, keyed by asset. */
  parts: Record<AssetId, number>;
}

export interface DailyPoint {
  date: string;
  month: number;
  value: number;
  marketValue: number;
  /** Player's portfolio return on this day. */
  r: number;
  /** Market return on this day. */
  marketR: number;
  liquidated: boolean;
}

export type RankId = "liquidated" | "legend" | "winner" | "small_win" | "tuition" | "leek";

export interface Rank {
  id: RankId;
  label: string;
  color: string;
}

export type PersonaId =
  | "leverage_maniac"
  | "top_escaper"
  | "bottom_hunter"
  | "chaser"
  | "scared_bird"
  | "diamond_hands"
  | "drifter";

export interface Persona {
  title: string;
  emoji: string;
  /** Fluent emoji file in public/art/emoji (scripts/build_art.mjs); the Unicode emoji stays for share text */
  art?: string;
  desc: string;
  quotes: string[];
  color: string;
}
