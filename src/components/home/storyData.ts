import data from "@/components/hero/kline2015.json";

export const HEADLINES = [
  { day: "12月31日", outlet: "财经晨报", text: "沪指年末站上3200点，全年涨超五成", tone: "bg-up" },
  { day: "12月25日", outlet: "证券时报（虚构）", text: "新增开户数创七年新高，营业部排长队", tone: "bg-up" },
  { day: "12月8日", outlet: "每日财讯", text: "两融余额突破万亿，券商股两月近翻倍", tone: "bg-up" },
];
export const BARS = [
  { name: "上证50 ETF", v: 30, color: "#FF8A3D" },
  { name: "创业板 ETF", v: 25, color: "#FF4D4F" },
  { name: "银行板块", v: 10, color: "#3FB950" },
  { name: "白酒板块", v: 5, color: "#F5B400" },
  { name: "货币基金", v: 10, color: "#8B95A3" },
  { name: "融资加杠杆", v: 20, color: "#A855F7" },
];
export const COPY = [
  { h: "读头条", p: "每月三条头条加一条小道消息，真假自己分辨。头条只写回合开始时已经发生的事，不剧透。" },
  { h: "分仓位", p: "六种资产自由配比，未来走势被遮住，只能看过去。融资加杠杆是两倍杠杆，亏一半强平。" },
  { h: "听结果", p: "十二个月后结算人格和段位，再把你这一年的资产曲线演奏成一段音乐。" },
];

/** Path through ~24 real 2015 closes, in a 420 x 200 box. */
export function linePath() {
  const pts = data.closes.filter((_, i) => i % 10 === 0 || i === data.peak);
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  return pts.map((v, i) => `${i ? "L" : "M"}${((i / (pts.length - 1)) * 420).toFixed(1)} ${(200 - ((v - lo) / (hi - lo)) * 190 - 5).toFixed(1)}`).join(" ");
}

