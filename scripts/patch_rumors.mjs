// One-off content pass (v8, after the 2026-10-01 review):
//  - 2015 and 2020 had their true / false rumours in a strict odd / even order, and several false ones were
//    obvious jokes. Rewrite those months so the order carries no pattern and the noise sounds plausible.
//  - Every rumour gets `rumorCall`: which asset it points at and in which direction (null when it names an event,
//    not a direction), so the settle dialog can answer separately: did it come true / did the asset move its way /
//    did you act on it.
//  - 2020 gets a third historical moment (April round), like the other years.
// Applies to both the reviewed source (scripts/timelines/*.headlines.json) and the built content/scripts/*.json.
import { readFileSync, writeFileSync } from "node:fs";

const M = "market";
const up = (asset = M) => ({ asset, dir: 1 });
const dn = (asset = M) => ({ asset, dir: -1 });

/** [rumor text or null to keep, isSignal or null to keep, call] per month */
const PLAN = {
  2007: [
    [null, null, up()],
    [null, null, up()],
    [null, null, up()],
    ["我在银行的朋友说马上又要加息，四月先空仓躲一躲。", false, dn()],
    [null, null, dn()],
    [null, null, up("cyb")],
    ["听说印花税还要再往上加，这个月肯定还得跌。", false, dn()],
    [null, null, up()],
    [null, null, dn()],
    [null, null, up()],
    [null, null, dn("sh50")],
    [null, null, dn()],
  ],
  2008: [
    [null, null, dn("sh50")],
    [null, null, up()],
    [null, null, dn()],
    [null, null, up()],
    [null, null, up()],
    [null, null, dn()],
    [null, null, dn()],
    [null, null, up()],
    [null, null, up()],
    [null, null, dn()],
    [null, null, up()],
    [null, null, dn()],
  ],
  2015: [
    [null, true, dn("sh50")],
    ["我在银行的朋友说央行这个月要降准，钱一松，大盘还得往上走。", true, up()],
    [null, true, up()],
    ["我朋友说证监会要严查场外配资，四月肯定先跌一波，等跌了再进。", false, dn()],
    [null, true, up("cyb")],
    ["我同学在券商说这次清查配资只是走走过场，六月还能接着冲。", false, up()],
    [null, true, dn()],
    ["听说人民币要贬值了，外资要往外跑，这个月还得跌。", true, dn()],
    ["听说节前要发大红包救市，九月就能把跌的都涨回来。", false, up()],
    ["我表弟在银行，说这个月可能又要降息降准一起来，市场要回暖。", true, up()],
    [null, true, null],
    ["听说注册制明年一推，新股一多，小票得先跌一半。", false, dn("cyb")],
  ],
  2018: [
    [null, null, up("bank")],
    [null, null, dn()],
    [null, null, up("bank")],
    [null, null, up()],
    [null, null, up("baijiu")],
    [null, null, dn()],
    [null, null, dn()],
    [null, null, dn()],
    [null, null, dn()],
    [null, null, dn()],
    [null, null, up()],
    [null, null, up()],
  ],
  2020: [
    [null, true, dn()],
    ["我同事说节后一开市科技股肯定崩，创业板赶紧先清掉。", false, dn("cyb")],
    [null, true, dn()],
    ["听说复工复产的政策一波接一波，跌下来的票这个月要反弹了。", true, up()],
    [null, true, up("baijiu")],
    ["听说创业板要改注册制，新股一多，老的科技股要被抽血跌一波。", false, dn("cyb")],
    [null, true, up()],
    ["群里说七月涨得太猛了，八月一定回吐，先清仓等着。", false, dn()],
    [null, true, dn("baijiu")],
    ["我在券商的朋友说，有家巨头要上市，打新要冻住一大笔钱，大盘这个月涨不动。", true, null],
    [null, true, up("bank")],
    ["听说年底高端白酒要被限价，机构都在悄悄往外跑。", false, dn("baijiu")],
  ],
  2024: [
    [null, null, dn("cyb")],
    [null, null, up()],
    [null, null, dn()],
    [null, null, up("bank")],
    [null, null, up()],
    [null, null, dn("baijiu")],
    [null, null, up()],
    [null, null, dn()],
    [null, null, up()],
    [null, null, up()],
    [null, null, up()],
    [null, null, dn()],
  ],
};

const MOMENT_2020_APR = {
  date: "2020-03-18",
  title: "3 月 18 日：美股十天四次熔断",
  text: "3 月 9 日到 18 日，美股十天里四次触发熔断，美联储 15 日紧急把利率降到零。全球资产一起暴跌，A 股跟着走弱，只是跌得比海外少。",
  question: "现在，你会？",
  options: [
    { label: "减半仓", effect: { scale: 0.5 } },
    { label: "不动", effect: null },
    { label: "加杠杆", effect: { marginPlus: 20 } },
  ],
};

for (const [year, rows] of Object.entries(PLAN)) {
  for (const file of [`scripts/timelines/${year}.headlines.json`, `content/scripts/${year}.json`]) {
    const raw = readFileSync(file, "utf8");
    if (/^\{\r?\n  "/.test(raw)) {
      // hand-formatted source: edit the text in place so the layout survives
      let i = 0;
      let out = raw.replace(/( *)"rumor": ("(?:[^"\\]|\\.)*"),(\r?\n\s*)"rumorIsSignal": (true|false),/g, (_m, ind, oldText, nl, sig) => {
        const [text, signal, call] = rows[i++];
        if (text && text.length > 40) throw new Error(`${year}: rumor over 40 chars`);
        const t = text ? JSON.stringify(text) : oldText;
        const s = signal === null ? sig : String(signal);
        const c = call ? `{ "asset": "${call.asset}", "dir": ${call.dir} }` : "null";
        return `${ind}"rumor": ${t},${nl}"rumorIsSignal": ${s},${nl}"rumorCall": ${c},`;
      });
      if (i !== 12) throw new Error(`${file}: found ${i} rumours`);
      writeFileSync(file, out);
      continue;
    }
    const d = JSON.parse(raw);
    rows.forEach(([text, signal, call], i) => {
      const m = d.months[i];
      if (text) m.rumor = text;
      if (signal !== null) m.rumorIsSignal = signal;
      m.rumorCall = call;
      if (text && text.length > 40) throw new Error(`${year}/${i}: rumor over 40 chars`);
    });
    if (year === "2020") d.months[3].moment = MOMENT_2020_APR;
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    writeFileSync(file, JSON.stringify(d, null, 1).replace(/\n/g, eol) + (raw.endsWith("\n") ? eol : ""));
  }
}
console.log("ok");
