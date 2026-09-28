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

export interface ScriptMonth {
  index: number;
  label: string;
  headlines: string[];
  rumor: string;
  rumorIsSignal: boolean;
  hindsight: string;
  marketReturn: number;
  returns: Record<AssetId, number>;
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
  peakMonth: number;
  troughMonth: number;
  assets: ScriptAsset[];
  params: ScriptParams;
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
  desc: string;
  quotes: string[];
  color: string;
}
