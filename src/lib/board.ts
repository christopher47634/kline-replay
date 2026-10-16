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

/**
 * 昵称屏蔽词。匹配前先做归一化（见 normalizeForMatch），所以这里只写规范形式；
 * 谐音、拼音缩写、字母替身也列在这里，因为它们归一化后仍然不同。
 */
const BLOCKLIST = [
  // 辱骂
  "傻逼", "傻b", "傻比", "傻币", "煞笔", "沙比", "操你", "草你", "艹你", "妈的", "尼玛", "你妈",
  "fuck", "shit", "bitch",
  // 政治敏感
  "习近平", "共产党", "法轮", "台独", "藏独", "疆独",
  // 色情、赌博、引流
  "色情", "约炮", "赌博", "博彩", "代开发票", "加微信", "加v", "qq群", "http", "www",
];

/** 带符号才有意义的词（去掉分隔符后「com」会误伤 comet），只在原文里找 */
const LITERAL_BLOCKLIST = [".com", ".cn", ".net", "://"];

/**
 * 拼音缩写太短，做子串匹配会误伤正常英文（Isbell 里有 sb）：只在前后不是字母时命中，
 * 例如「sb」「老sb」「sb123」命中，「Isbell」不命中。
 */
const ABBREVIATIONS = ["sb", "cnm", "nmsl", "xjp", "gcd", "vx", "wx", "fck", "fuk"];
const ABBREVIATION_RE = new RegExp(`(^|[^a-z])(${ABBREVIATIONS.join("|")})(?![a-z])`);

/** 字母替身：f*ck、5h1t、$b 之类 */
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

/** 去掉空白、标点、符号、零宽字符等分隔符：「傻 逼」「傻.逼」「f_u_c_k」都还原成连续的字 */
function stripSeparators(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}\p{Cf}_]/gu, "");
}

/**
 * 归一化后再匹配：NFKC（全角转半角）、转小写、还原字母替身（5h1t → shit、$b → sb），再去掉分隔符。
 * 字母替身要在去符号之前还原，否则 $、@ 会被当成分隔符删掉。
 */
export function normalizeForMatch(text: string): string {
  return stripSeparators(text.normalize("NFKC").toLowerCase().replace(/[0-9@$!]/g, (c) => LEET[c] ?? c));
}

/** 不允许出现在昵称里的字符：控制字符、零宽字符、私用区 */
const FORBIDDEN_CHARS = /[\p{Cc}\p{Cf}\p{Co}]/u;

export function cleanNickname(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!name || [...name].length > 8 || FORBIDDEN_CHARS.test(name)) return null;
  const plain = stripSeparators(name);
  // 只有符号的昵称（"!!!"、"..."）没有意义，一并拒绝
  if (!plain) return null;
  const leet = normalizeForMatch(name);
  const lower = name.toLowerCase();
  if (BLOCKLIST.some((w) => plain.includes(w) || leet.includes(w))) return null;
  if (LITERAL_BLOCKLIST.some((w) => lower.includes(w))) return null;
  // 缩写只在去分隔符后的原样文本上查：数字不还原，「sb123」才能命中、「股神2024」不受影响
  if (ABBREVIATION_RE.test(plain) || ABBREVIATION_RE.test(leet)) return null;
  return name;
}
