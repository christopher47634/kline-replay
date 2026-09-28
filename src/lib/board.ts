import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface ScoreRow {
  id: string;
  script_id: string;
  nickname: string;
  ret: number;
  persona: string;
  encoded: string;
  created_at: string;
}

/** Leaderboard is optional: without both env vars the UI hides it and the API returns []. */
export const boardEnabled = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient | null {
  if (!boardEnabled()) return null;
  client ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  return client;
}

const BLOCKLIST = ["傻逼", "操你", "妈的", "fuck", "shit", "习近平", "共产党", "法轮", "台独", "色情", "赌博", "代开发票", "加微信", "vx", "http"];

export function cleanNickname(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name || [...name].length > 8) return null;
  const lower = name.toLowerCase();
  if (BLOCKLIST.some((w) => lower.includes(w))) return null;
  return name;
}
