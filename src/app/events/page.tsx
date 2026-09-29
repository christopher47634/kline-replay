import type { Metadata } from "next";
import Link from "next/link";
import { allDecks } from "@/events/data";

export const metadata: Metadata = {
  title: "大事件猜涨跌 · 穿越 K 线",
  description: "3 分钟一局：给你一张历史大事件卡和事发前 60 天的走势，猜之后 20 个交易日涨还是跌。",
};

const BLURB: Record<string, string> = {
  "a-share-classics": "印花税、熔断、股灾、一揽子政策……那些让 A 股上过头条的日子。",
  "global-black-swans": "黑色星期一、雷曼、闪电崩盘、疫情熔断……全球市场的至暗与反转。",
};

export default function EventsHome() {
  const decks = allDecks();
  return (
    <main className="mx-auto max-w-[1080px] px-4 py-14 md:py-20">
      <Link href="/" className="text-sm text-sub hover:text-ink">
        ← 回首页
      </Link>
      <h1 className="mt-4 text-4xl md:text-5xl font-black tracking-tight">大事件猜涨跌</h1>
      <p className="mt-4 text-sub max-w-[52ch] leading-relaxed">
        3 分钟一局。每局随机抽 10 张历史事件卡：看事件、看事发前 60 个交易日的真实走势，然后猜之后 20 个交易日是涨还是跌。
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {decks.map((d) =>
          d.available ? (
            <Link key={d.id} href={`/events/${d.id}`} className="block rounded-2xl bg-card border border-line p-6 hover:border-sub transition-colors focus-visible:outline-2 focus-visible:outline-gold">
              <p className="text-2xl font-black">{d.title}</p>
              <p className="mt-2 text-sm text-sub leading-relaxed">{BLURB[d.id]}</p>
              <p className="mt-4 text-xs text-sub flex gap-4">
                <span>
                  <b className="num text-ink">{d.events.length}</b> 张事件卡
                </span>
                <span>标的：{d.indexName}</span>
              </p>
            </Link>
          ) : (
            <div key={d.id} className="rounded-2xl border border-dashed border-line p-6 opacity-60">
              <p className="text-2xl font-black">{d.title}</p>
              <p className="mt-2 text-sm text-sub">行情数据暂不可用</p>
            </div>
          ),
        )}
      </div>
      <p className="mt-10 text-xs text-sub">虚拟游戏 · 历史数据不代表未来 · 不构成任何投资建议</p>
    </main>
  );
}
