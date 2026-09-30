import { describe, expect, it } from "vitest";
import { blindScript, blindText, mysterySlug } from "@/lib/blind";
import { getScript, SCRIPT_IDS } from "@/lib/scripts";
import type { Script } from "@/game/types";

/** Everything a player reads during the game (the result page reveals the year on purpose). */
function visible(s: Script): string {
  const parts = [s.title, s.subtitle, s.intro, ...s.assets.flatMap((a) => [a.name, a.desc]), ...s.preMonths.map((m) => m.label)];
  for (const m of s.months) {
    parts.push(m.label, m.rumor, m.hindsight, ...m.headlines.map((h) => h.text));
    if (m.moment) parts.push(m.moment.date, m.moment.title, m.moment.text, m.moment.question);
  }
  return parts.join("\n");
}

const GIVEAWAYS = ["雷曼", "奥运", "汶川", "中石油", "中国石油", "港股直通车", "十七大", "三中全会", "吴清", "国九条", "蚂蚁", "中兴", "刘鹤", "科创板", "新冠", "武汉", "四万亿", "互联网+", "十三五", "十四五", "中小板", "创业板", "茅台", "上证50", "贝尔斯登", "阅兵"];

describe("盲盒模式", () => {
  it("no year number and no giveaway name is left in anything the player reads", () => {
    for (const id of SCRIPT_IDS) {
      const text = visible(blindScript(getScript(id)!));
      // a year as a year ("2008年", "2008-09-19", or the year itself), not amounts like "2000 亿美元"
      expect(text, id).not.toMatch(/(19|20)\d{2}\s*年|(19|20)\d{2}-\d{2}/);
      for (const y of [Number(id) - 1, Number(id), Number(id) + 1]) expect(text, `${id}: ${y}`).not.toMatch(new RegExp(`${y}(?!\\s*[亿万])`));
      for (const g of GIVEAWAYS) expect(text.includes(g), `${id}: ${g}`).toBe(false);
    }
  });
  it("index levels are rescaled to 起点 = 100; percentages and 百分点 are left alone", () => {
    const s2015 = getScript("2015")!;
    expect(blindText("6月12日沪指见顶5178点", s2015)).toBe("6月12日沪指见顶160点"); // 5178 / 3234.68
    expect(blindText("沪指2月在4200至4600点间震荡", getScript("2008")!)).toBe("沪指2月在80至87点间震荡");
    expect(blindText("央行降准0.5个百分点，沪指跌7.7%", s2015)).toBe("央行降准0.5个百分点，沪指跌7.7%");
    expect(blindText("沪指2014年大涨，2015年开门红", s2015)).toBe("沪指去年大涨，今年开门红");
  });
  it("the numbers of the game are untouched: same returns, same daily bars, same id for the result link", () => {
    for (const id of SCRIPT_IDS) {
      const real = getScript(id)!;
      const b = blindScript(real);
      expect(b.id).toBe(real.id);
      expect(b.blind).toBe(true);
      expect(b.months.map((m) => m.returns)).toEqual(real.months.map((m) => m.returns));
      expect(b.months.map((m) => m.daily)).toEqual(real.months.map((m) => m.daily));
    }
  });
  it("mystery slugs are stable, distinct and do not contain the year", () => {
    const slugs = SCRIPT_IDS.map(mysterySlug);
    expect(new Set(slugs).size).toBe(SCRIPT_IDS.length);
    for (const [i, s] of slugs.entries()) expect(s).not.toContain(SCRIPT_IDS[i]);
    expect(mysterySlug("2015")).toBe(mysterySlug("2015"));
  });
});
