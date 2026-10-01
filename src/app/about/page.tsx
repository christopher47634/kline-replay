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
  { id: "bystander", rule: "全年平均现金 ≥ 80%（和「拿着不动」分开：一直空仓是看戏，不是坚定持有）" },
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
        <p className="mt-3 text-ink/90">
          加杠杆一律按 2 倍做多上证 50 计算，按<b>月末</b>结算判定强平：当月杠杆亏损达到 50%（上证 50 当月跌约 25%）时这一格归零；月内的每日曲线只是示意，不做盘中强平。利息按当年水平：2015、2018、2020 年融资年息 8.4%（每月 0.7%），2024 年约 6%。2007、2008
          年还没有融资融券，这一格是场外配资，月息约 1%。货币基金的收益也按各年的水平设定（约 1.8%–3.6%）。
        </p>
        <p className="mt-3 text-ink/90">
          开局前可以选一张任务卡（可跳过）：「守住本金」要求年末不亏、每月风险资产至少 20%、不能用融资；「跑赢指数」要求年末跑赢满仓上证综指、融资最多
          20%。历史行情不变，只是目标和限制不同；每张任务在六个年份都有解。成绩只看收益，强平没打穿账户就作为特殊事件单独列出，不再顶替成绩。
        </p>
        <p className="mt-3 text-ink/90">
          小道消息有真有假、没有固定规律。你可以表态「更相信 / 暂不采信」，月底分三件事回答：消息有没有成真、它说的方向本月有没有走出来、你有没有照着它调仓——消息是真的，涨跌也可能不跟着走。
        </p>
        <p className="mt-3 text-ink/90">
          2007、2008 年还没有创业板和白酒指数：成长股那一格用中小板 ETF（159902），白酒那一格用贵州茅台个股；新加的几个年份里，上证 50 和创业板用的是指数本身。
        </p>
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
