/* C1 checkpoint: replay the Appendix B fixed play in the terminal. Run: npm run cli [2015] */
import { benchmarks, everLiquidated, playAll, rank, totalReturn } from "../src/game/engine";
import { APPENDIX_B } from "../src/game/fixtures";
import { encodeGame } from "../src/game/encode";
import { judgePersona, keyMoves, pickQuote, PERSONAS } from "../src/game/persona";
import { getScript } from "../src/lib/scripts";

const id = process.argv[2] ?? "2015";
const script = getScript(id);
if (!script) throw new Error(`unknown script ${id}`);

const pct = (x: number) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%`;
const yuan = (x: number) => `¥ ${Math.round(x).toLocaleString("en-US")}`;

console.log(`\n${script.title}  (peakMonth=${script.peakMonth}, troughMonth=${script.troughMonth})\n`);
const history = playAll(script, APPENDIX_B);
for (const r of history) {
  const a = r.alloc;
  const mix = `50:${a.sh50} 创:${a.cyb} 银:${a.bank} 酒:${a.baijiu} 现:${a.cash} 杠:${a.margin}`;
  console.log(`${script.months[r.month].label.padEnd(10)} ${mix.padEnd(34)} ${pct(r.pnl).padStart(7)}  ${yuan(r.cashAfter)}${r.liquidated ? "  ⚠ 强平" : ""}`);
}
const ret = totalReturn(script, history);
const b = benchmarks(script, history);
const persona = judgePersona(history, script);
console.log(`\n收益 ${pct(ret)} ｜ 段位 ${rank(ret, everLiquidated(history)).label} ｜ 人格 ${PERSONAS[persona].emoji} ${PERSONAS[persona].title} (${persona})`);
console.log(`"${pickQuote(persona, history)}"`);
console.log(`满仓大盘 ${pct(b.market[12] / script.startCash - 1)} ｜ 全程现金 ${pct(b.cash[12] / script.startCash - 1)} ｜ 散户平均 ${pct(b.retailAvg)}`);
for (const m of keyMoves(history, script)) console.log(`· ${m.label}：${m.text}`);
console.log(`\n分享码 ${encodeGame(script.id, APPENDIX_B)}\n`);
