import type { Metadata } from "next";
import { Emoji } from "@/components/ui/Emoji";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { PERSONAS } from "@/game/persona";
import { getScript, SCRIPT_IDS } from "@/lib/scripts";

export const metadata: Metadata = { title: "玩法与数据说明 · 穿越 K 线" };

const RULES: { id: keyof typeof PERSONAS; rule: string }[] = [
  { id: "leverage_maniac", rule: "融资加杠杆 ≥ 30% 的月份 ≥ 4 个" },
  { id: "top_escaper", rule: "大盘月末最高点前后一个月内，某月「创业板 + 杠杆」≤ 20%，且前一月 ≥ 40%" },
  { id: "bottom_hunter", rule: "大盘月末最低点当月或下月，「创业板 + 杠杆」比前一月增加 ≥ 30%" },
  { id: "chaser", rule: "大盘连涨 2 个月后的下一月，「创业板 + 杠杆」增加 ≥ 20%，出现 ≥ 2 次" },
  { id: "scared_bird", rule: "某月亏损后，下一月货币基金 ≥ 60%，出现 ≥ 2 次" },
  { id: "diamond_hands", rule: "每月换手幅度都 ≤ 10%" },
  { id: "drifter", rule: "以上都不是" },
];

const MUSIC = [
  ["主旋律", "你的资产曲线，每个交易日一个音（三角波合成器）"],
  ["音高", "收益 −50% 到 +50% 映射到 15 级五声音阶；全年赚钱用 C 大调，亏钱用 A 小调；单日涨跌超 3% 再升/降一级"],
  ["力度", "单日涨跌幅 0% 到 5% 映射到力度 0.4 到 1.0"],
  ["低音", "上证综指，每 5 个交易日一个音，低两个八度"],
  ["镲", "换仓月的第一个交易日；你的曲线与大盘交叉（跑赢/跑输切换）"],
  ["低鼓", "单日亏损 ≥ 5% 一声；融资仓位被强平时三连击，画面闪红"],
  ["装饰音", "单日上涨 ≥ 5% 时加一个高八度的音"],
  ["速度", "每音 0.2 秒，一年约 49 秒；可切换 2 倍速"],
];

export default function About() {
  const sources = SCRIPT_IDS.flatMap((id) => getScript(id)!.sources.map((s) => ({ ...s, year: id })));
  return (
    <main className="mx-auto max-w-[760px] px-4 py-12 leading-relaxed">
      <Link href="/" className="text-sm text-sub hover:text-ink -my-2 inline-block py-2">
        ← 回首页
      </Link>
      <Reveal as="h1" className="mt-4 font-display text-h1">玩法与数据说明</Reveal>

      <section className="mt-10">
        <h2 className="text-xl font-bold">玩法</h2>
        <p className="mt-3 text-ink/90">
          你带着 10 万元虚拟资金回到某一年的元旦。每回合是一个月：先读 3 条头条和 1 条小道消息（都是回合开始时已经发生的事），再把资金分到 6
          种资产上，然后用这个月真实的历史行情结算。12 个回合后结算收益、段位和投资人格，并把你这一年的资产曲线和大盘曲线演奏成一段音乐。
        </p>
        <p className="mt-3 text-ink/90">融资加杠杆按 2 倍做多上证 50 计算，年息 8.4%（每月 0.7%），当月亏损达到 50% 时强平归零。</p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">数据来源</h2>
        <ul className="mt-3 space-y-1.5 text-ink/90">
          {sources.map((s) => (
            <li key={s.year + s.label}>
              <span className="num text-sub mr-2">{s.year}</span>
              <a href={s.url} className="inline-block py-1.5 underline underline-offset-4 hover:text-gold" target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-sub">
          行情为上证 50 ETF（510050）、创业板 ETF（159915）、中证银行（399986）、中证白酒（399997）和上证综指（000001）的日收盘数据，ETF 为前复权。头条由
          AI 基于真实事件改写成当年口吻，审核后入库，不保证逐字符合当年报道。
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">人格判定规则</h2>
        <p className="mt-2 text-sm text-sub">从上到下依次判定，命中即停。</p>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {RULES.map((r) => (
              <tr key={r.id} className="border-t border-line align-top transition-shadow duration-150 hover:shadow-[inset_4px_0_0_var(--color-gold)]">
                <td className="py-2.5 pr-4 whitespace-nowrap font-medium">
                  <span className="inline-flex items-center gap-2"><Emoji art={PERSONAS[r.id].art} char={PERSONAS[r.id].emoji} size={22} />{PERSONAS[r.id].title}</span>
                </td>
                <td className="py-2.5 text-ink/90">{r.rule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">音乐映射规则</h2>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {MUSIC.map(([k, v]) => (
              <tr key={k} className="border-t border-line align-top transition-shadow duration-150 hover:shadow-[inset_4px_0_0_var(--color-gold)]">
                <td className="py-2.5 pr-4 whitespace-nowrap font-medium">{k}</td>
                <td className="py-2.5 text-ink/90">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">免责声明</h2>
        <p className="mt-3 text-ink/90">
          本游戏全部使用虚拟资金，仅用于娱乐和了解历史。历史行情不代表未来表现，游戏内任何头条、小道消息、点评和人格评语都不构成投资建议。
        </p>
      </section>
    </main>
  );
}
