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

/**
 * 排行榜可选。读取用 anon key（或 service key，二者有其一即可）；写入只走服务端的 service role key
 * （SUPABASE_SERVICE_ROLE_KEY），表上不再有公开 insert 策略。
 * 只配了 anon key 时：榜单照常展示，但提交被关闭（结果页不显示"上榜"，POST 返回 503 并在日志里提示）。
 */
const readKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
export const boardEnabled = () => Boolean(process.env.SUPABASE_URL && readKey());
export const boardWritable = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const clients = new Map<string, SupabaseClient>();
function client(key: string): SupabaseClient {
  let c = clients.get(key);
  if (!c) {
    c = createClient(process.env.SUPABASE_URL!, key, { auth: { persistSession: false } });
    clients.set(key, c);
  }
  return c;
}

export function supabase(): SupabaseClient | null {
  const key = readKey();
  return process.env.SUPABASE_URL && key ? client(key) : null;
}

/** 写入专用客户端；没有 service role key 时返回 null。 */
export function supabaseWriter(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return process.env.SUPABASE_URL && key ? client(key) : null;
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
