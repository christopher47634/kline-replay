import Link from "next/link";
import { HeroCta } from "@/components/home/HeroCta";
import { BoardCount } from "@/components/home/BoardCount";
import { boardEnabled } from "@/lib/board";

const SCRIPTS = [
  { id: "2015", title: "2015：疯牛与股灾", note: "沪指 3200 → 5178 → 2850", stars: 4, minutes: 6, open: true },
  { id: "2020", title: "2020：疫情与核心资产", note: "黑天鹅、零利率、抱团白酒", stars: 3, minutes: 6, open: true },
  { id: "2007", title: "2007：大牛市", note: "敬请期待", stars: 0, minutes: 0, open: false },
];

export default function Home() {
  const board = boardEnabled();
  return (
    <main className="mx-auto max-w-[1080px] px-4">
      <section className="pt-16 pb-14 md:pt-24 md:pb-20">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight">穿越 K 线</h1>
        <p className="mt-5 text-lg md:text-2xl text-ink/90 leading-relaxed max-w-[30ch]">
          回到 2015 年 6 月，沪指 <span className="num text-up">5178</span> 点。
          <br />
          如果是你，跑不跑？
        </p>
        <ul className="mt-6 space-y-1.5 text-sm text-sub max-w-[60ch]">
          <li>行情是真的：每一回合的涨跌来自真实历史数据。</li>
          <li>头条是“真事假写”：基于真实事件改写成当年口吻，不剧透。</li>
          <li>结果听得见：你的资产曲线和大盘被演奏成一段二重奏。</li>
        </ul>
        <HeroCta scriptId="2015" />
      </section>

      <section aria-labelledby="scripts-h" className="pb-14">
        <h2 id="scripts-h" className="text-xl font-bold">选一个年份</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {SCRIPTS.map((s) => {
            const body = (
              <>
                <div className="flex items-center justify-between">
                  <span className="num text-4xl font-black text-ink/90">{s.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.open ? "bg-up/15 text-up" : "bg-line text-sub"}`}>{s.open ? "可玩" : "敬请期待"}</span>
                </div>
                <p className="mt-4 font-bold">{s.title}</p>
                <p className="mt-1 text-sm text-sub">{s.note}</p>
                {s.open && (
                  <p className="mt-4 text-xs text-sub flex flex-wrap gap-x-3 gap-y-1">
                    <span>
                      难度 <span className="text-gold">{"★".repeat(s.stars)}</span>
                      <span className="text-line">{"★".repeat(5 - s.stars)}</span>
                    </span>
                    <span>约 {s.minutes} 分钟</span>
                    {board && <BoardCount scriptId={s.id} />}
                  </p>
                )}
              </>
            );
            return s.open ? (
              <Link key={s.id} href={`/play/${s.id}`} className="block rounded-2xl bg-card border border-line p-5 hover:border-sub transition-colors focus-visible:outline-2 focus-visible:outline-gold">
                {body}
              </Link>
            ) : (
              <div key={s.id} className="rounded-2xl border border-dashed border-line p-5 opacity-60">
                {body}
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="events-h" className="pb-14">
        <Link href="/events" className="block rounded-2xl bg-card border border-gold/40 p-6 hover:border-gold transition-colors focus-visible:outline-2 focus-visible:outline-gold">
          <div className="flex items-center justify-between">
            <h2 id="events-h" className="text-xl font-bold">
              大事件猜涨跌 · 3 分钟
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gold/15 text-gold">新玩法</span>
          </div>
          <p className="mt-2 text-sm text-sub">熔断、股灾、雷曼、疫情……抽 10 张历史事件卡，猜之后 20 个交易日涨还是跌，答案会被演奏出来。</p>
        </Link>
      </section>

      <section aria-labelledby="how-h" className="pb-16">
        <h2 id="how-h" className="text-xl font-bold">怎么玩</h2>
        <ol className="mt-5 grid gap-6 md:grid-cols-3">
          <Step icon={<IconNews />} title="读头条" text="每月 3 条头条加 1 条小道消息，真假自己分辨。" />
          <Step icon={<IconSliders />} title="分仓位" text="6 种资产自由配比，未来走势被遮住，只能看过去。" />
          <Step icon={<IconWave />} title="听结果" text="12 个月后结算人格，再把这一年演奏成音乐。" />
        </ol>
        {board && (
          <p className="mt-10 text-sm">
            <Link href="/board/2015" className="text-gold underline underline-offset-4">
              看看排行榜 →
            </Link>
          </p>
        )}
        <p className="mt-10 text-xs text-sub flex gap-4">
          <Link href="/about" className="hover:text-ink underline underline-offset-4">
            玩法与数据说明
          </Link>
          {process.env.NEXT_PUBLIC_REPO_URL && (
            <a href={process.env.NEXT_PUBLIC_REPO_URL} className="hover:text-ink underline underline-offset-4">
              GitHub
            </a>
          )}
        </p>
      </section>
    </main>
  );
}

function Step({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex gap-4">
      <span className="shrink-0 w-11 h-11 rounded-xl bg-card border border-line grid place-items-center text-gold">{icon}</span>
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-1 text-sm text-sub leading-relaxed">{text}</p>
      </div>
    </li>
  );
}

const svg = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const IconNews = () => (
  <svg {...svg}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 8h10M7 12h10M7 16h6" />
  </svg>
);
const IconSliders = () => (
  <svg {...svg}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);
const IconWave = () => (
  <svg {...svg}>
    <path d="M3 12h2l2-5 3 10 3-13 3 11 2-3h3" />
  </svg>
);
