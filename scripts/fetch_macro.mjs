// Real macro context for each script year (the 盘口 workbench and the 「更多数据」 drawer).
// Source: Eastmoney data center (datacenter-web.eastmoney.com), monthly series + daily margin balance.
// Usage: node scripts/fetch_macro.mjs   -> content/data/macro.json
// `lag` = how many months after the data month a player could first see it at the start of a round:
//   PMI (released on the last day of the same month) and month-end margin balance: 1
//   CPI / PPI / M2 (released around the 10th of the next month) and new investors (published the next month): 2
// The game shows a point only if its data month <= (round's calendar month - lag), so nothing leaks from the future.
import { writeFileSync } from "node:fs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";
const api = (q) => `https://datacenter-web.eastmoney.com/api/data/v1/get?${q}`;
async function get(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA } });
      const j = await r.json();
      if (j.success) return j.result?.data ?? [];
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 700));
  }
  throw new Error("fetch failed: " + url);
}

const YEARS = { 2015: ["2014-09", "2015-12"], 2020: ["2019-09", "2020-12"] };
const inRange = (m, [a, b]) => m >= a && m <= b;

const MONTHLY = [
  { id: "pmi", name: "制造业 PMI", unit: "", report: "RPT_ECONOMY_PMI", col: "MAKE_INDEX", lag: 1, base: 50, note: "50 为荣枯线；统计局每月最后一天发布当月数据" },
  { id: "cpi", name: "CPI 同比", unit: "%", report: "RPT_ECONOMY_CPI", col: "NATIONAL_SAME", lag: 2, base: 0, note: "统计局次月 10 日前后发布" },
  { id: "ppi", name: "PPI 同比", unit: "%", report: "RPT_ECONOMY_PPI", col: "BASE_SAME", lag: 2, base: 0, note: "统计局次月 10 日前后发布" },
  { id: "m2", name: "M2 同比", unit: "%", report: "RPT_ECONOMY_CURRENCY_SUPPLY", col: "BASIC_CURRENCY_SAME", lag: 2, base: null, note: "人民银行次月中旬前发布" },
];

const out = { fetchedAt: new Date().toISOString(), source: "东方财富数据中心 datacenter-web.eastmoney.com", years: {} };
for (const [year, range] of Object.entries(YEARS)) {
  const series = [];
  for (const s of MONTHLY) {
    const rows = (await get(api(`reportName=${s.report}&columns=REPORT_DATE,${s.col}&pageSize=200&sortColumns=REPORT_DATE&sortTypes=1&filter=(REPORT_DATE%3E%3D%27${range[0]}-01%27)(REPORT_DATE%3C%3D%27${range[1]}-01%27)`)))
      .map((r) => ({ m: r.REPORT_DATE.slice(0, 7), v: typeof r[s.col] === "number" ? Math.round(r[s.col] * 10) / 10 : r[s.col] }))
      .filter((r) => typeof r.v === "number" && inRange(r.m, range));
    series.push({ id: s.id, name: s.name, unit: s.unit, lag: s.lag, base: s.base, note: s.note, rows });
  }
  // month-end margin balance (两融余额, 亿元): last trading day of each month
  const daily = await get(api(`reportName=RPTA_RZRQ_LSHJ&columns=DIM_DATE,RZRQYE&pageSize=500&sortColumns=DIM_DATE&sortTypes=1&filter=(DIM_DATE%3E%3D%27${range[0]}-01%27)(DIM_DATE%3C%3D%27${range[1]}-31%27)`));
  const last = new Map();
  for (const d of daily) last.set(d.DIM_DATE.slice(0, 7), Math.round(d.RZRQYE / 1e8));
  series.push({ id: "margin", name: "两融余额", unit: " 亿", lag: 1, base: null, note: "沪深两市融资融券余额，取每月最后一个交易日；交易所次日公布", rows: [...last].map(([m, v]) => ({ m, v })) });
  // new investors (新增投资者, 万户): China Securities Depository and Clearing, via Eastmoney
  const inv = (await get(api(`reportName=RPT_STOCK_OPEN_DATA&columns=STATISTICS_DATE,ADD_INVESTOR&pageSize=200&sortColumns=STATISTICS_DATE&sortTypes=1&filter=(STATISTICS_DATE%3E%3D%27${range[0]}%27)(STATISTICS_DATE%3C%3D%27${range[1]}%27)`)))
    .map((r) => ({ m: r.STATISTICS_DATE.slice(0, 7), v: r.ADD_INVESTOR }))
    .filter((r) => typeof r.v === "number" && inRange(r.m, range)); // the server ignores this filter: apply it here
  if (inv.length) series.push({ id: "investors", name: "新增投资者", unit: " 万户", lag: 2, base: null, note: "中国结算月度统计，次月公布", rows: inv });
  out.years[year] = series;
  console.log(year, series.map((s) => `${s.id}:${s.rows.length} ${s.rows[0]?.m}..${s.rows.at(-1)?.m}`).join("  "));
}
writeFileSync(new URL("../content/data/macro.json", import.meta.url), JSON.stringify(out, null, 1));
console.log("wrote content/data/macro.json");
