import type { Script } from "@/game/types";

/*
 * 盲盒模式: the same real year, with everything that would name it taken out, so the game tests judgement rather
 * than memory. The prices, returns and dates within the year are untouched; only the words change:
 *  - years become 今年 / 去年 / 前年 / 明年;
 *  - index levels are rescaled to 起点 = 100 (the chart already works that way): 5178 点 → 160 点 in 2015;
 *  - landmark names that give the year away become plain descriptions (雷曼兄弟 → 美国一家大型投行 …);
 *  - the assets get era-neutral names (中小板 ETF / 创业板指 → 成长股, 贵州茅台 → 白酒 …).
 * Some years stay guessable from the story itself (a pandemic, a mega stimulus) — that is part of the game.
 * The mystery route (/mystery/[slug]) hides which year a link opens.
 */

/** Longest first where one term contains another. */
const TERMS: [string, string][] = [
  ["北京奥运会", "一场全球体育盛会"],
  ["奥运会", "全球体育盛会"],
  ["奥运行情", "盛会行情"],
  ["奥运", "体育盛会"],
  ["四川汶川", "西南地区"],
  ["汶川", "西南地区"],
  ["雷曼兄弟", "美国一家大型投行"],
  ["贝尔斯登被摩根大通低价收购", "美国一家投行被同业低价收购"],
  ["'两房'", "两家房贷巨头"],
  ["次贷危机", "房贷危机"],
  ["中国平安", "一家保险巨头"],
  ["平安要找", "一家保险巨头要找"],
  ["平安公告", "一家保险巨头公告"],
  ["阅兵休市", "节日休市"],
  ["中国石油A股", "一只超级权重股"],
  ["中国石油", "一只超级权重股"],
  ["中石油", "那只超级权重股"],
  ["油田", "石油系统"],
  ["港股直通车", "港股新通道"],
  ["十七大", "重要会议"],
  ["二十届三中全会", "重要会议"],
  ["三中全会", "重要会议"],
  ["工行、国寿", "大型银行、保险"],
  ["1.55万亿元特别国债", "万亿级特别国债"],
  ["四万亿元", "数万亿元"],
  ["四万亿", "数万亿"],
  ["4 万亿元", "数万亿元"],
  ["互联网+", "新经济"],
  ["十三五", "五年规划"],
  ["十四五", "五年规划"],
  ["中兴", "一家中国通讯企业"],
  ["刘鹤副总理", "副总理"],
  ["刘鹤", "副总理"],
  ["富时罗素", "又一家国际指数公司"],
  ["MSCI", "国际指数公司"],
  ["科创板八条", "科创新政"],
  ["科创板", "新的科技板块"],
  ["新冠肺炎疫情", "突发疫情"],
  ["新冠", "突发"],
  ["武汉封城", "疫区封城"],
  ["蚂蚁集团", "一家金融科技巨头"],
  ["鼠年", "新年"],
  ["吴清", "新主席"],
  ["新'国九条'", "资本市场新政"],
  ["新‘国九条’", "资本市场新政"],
  ["'国九条'", "资本市场新政"],
  ["飞天茅台", "高端白酒"],
  ["茅台", "白酒龙头"],
  ["中小板 ETF", "成长股"],
  ["中小板", "成长股"],
  ["创业板指", "成长股指数"],
  ["创业板改革", "成长股板块改革"],
  ["创业板注册制", "成长股板块注册制"],
  ["创业板涨跌幅", "成长股板块涨跌幅"],
  ["创业板", "成长股"],
  ["上证50", "大盘蓝筹"],
];

const ASSET_NAMES: Record<string, [string, string]> = {
  sh50: ["大盘蓝筹", "大盘蓝筹指数，银行保险为主"],
  cyb: ["成长股", "中小盘成长股，涨得快跌得也快"],
  bank: ["银行板块", "估值低，波动小"],
  baijiu: ["白酒", "消费龙头"],
  cash: ["货币基金", "稳稳的"],
  margin: ["加杠杆", "借钱 2 倍做多大盘蓝筹，亏 50% 强平"],
};

export function blindText(text: string, s: Script): string {
  const year = Number(s.id);
  const base = s.baseClose ?? 0;
  const rel = (v: string) => (base > 0 ? String(Math.round((Number(v) / base) * 100)) : "某");
  let t = text;
  // index ranges first ("4200至4600点"), then single levels ("5178 点"); not 个百分点 (digits never touch 点 there)
  t = t.replace(/(\d{3,5}(?:\.\d+)?)(\s*至\s*)(\d{3,5}(?:\.\d+)?)(\s*)点/g, (_, a, mid, b, sp) => `${rel(a)}${mid}${rel(b)}${sp}点`);
  t = t.replace(/(\d{3,5}(?:\.\d+)?)(\s*)点/g, (_, a, sp) => `${rel(a)}${sp}点`);
  t = t.replace(/((?:19|20)\d{2})\s*年/g, (_, y) => {
    const d = Number(y) - year;
    return d === 0 ? "今年" : d === -1 ? "去年" : d === -2 ? "前年" : d === 1 ? "明年" : "那年";
  });
  for (const [from, to] of TERMS) t = t.split(from).join(to);
  return t;
}

export function blindScript(s: Script): Script {
  const b = (x: string) => blindText(x, s);
  return {
    ...s,
    blind: true,
    title: "盲盒：某一年",
    subtitle: "年份保密，玩完 12 个月再揭晓",
    intro: "年份保密。你带着 10 万元回到某一年的元旦，手里只有眼前的新闻和已知的数据。文中的点位都换算成了起点 = 100。12 个月后，猜猜这是哪一年。",
    assets: s.assets.map((a) => ({ ...a, name: ASSET_NAMES[a.id]?.[0] ?? a.name, desc: ASSET_NAMES[a.id]?.[1] ?? a.desc })),
    preMonths: s.preMonths.map((m) => ({ ...m, label: b(m.label) })),
    months: s.months.map((m) => ({
      ...m,
      label: `某年 ${m.index + 1} 月`,
      headlines: m.headlines.map((h) => ({ ...h, text: b(h.text) })),
      rumor: b(m.rumor),
      hindsight: b(m.hindsight),
      ...(m.moment
        ? { moment: { ...m.moment, date: `????${m.moment.date.slice(4)}`, title: b(m.moment.title), text: b(m.moment.text), question: b(m.moment.question) } }
        : {}),
    })),
    sources: [],
  };
}

/** Opaque, stable slug per year, so a mystery link does not say which year it opens. */
export function mysterySlug(id: string): string {
  let h = 2166136261;
  for (const c of `kline-mystery:${id}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36).slice(0, 6);
}

const LAST_MYSTERY = "kline:last-mystery";

/**
 * Opens a random 盲盒: never the box played last time (nor `except`). If that box was already finished, its save is
 * cleared so it starts fresh instead of showing 「这一局已经走完」; an unfinished one resumes.
 */
export function nextMystery(ids: string[], except?: string): string {
  let last: string | null = null;
  try {
    last = localStorage.getItem(LAST_MYSTERY);
  } catch {
    /* private mode */
  }
  const pool = ids.filter((id) => mysterySlug(id) !== last && id !== except);
  const id = (pool.length ? pool : ids)[Math.floor(Math.random() * (pool.length || ids.length))];
  const slug = mysterySlug(id);
  try {
    localStorage.setItem(LAST_MYSTERY, slug);
    const key = `kline-replay:blind-${id}`;
    if (JSON.parse(localStorage.getItem(key) ?? "null")?.state?.finished) localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  return `/mystery/${slug}`;
}
