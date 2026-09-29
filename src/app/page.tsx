import Link from "next/link";
import { EventsCard } from "@/components/home/EventsCard";
import { Hero } from "@/components/home/Hero";
import { Marquee } from "@/components/home/Marquee";
import { ScriptCards } from "@/components/home/ScriptCards";
import { Story } from "@/components/home/Story";
import { boardEnabled } from "@/lib/board";

export default function Home() {
  const board = boardEnabled();
  return (
    <main>
      <Hero />
      <Story />
      <div className="mx-auto max-w-[1120px] px-6">
        <section aria-labelledby="scripts-h" className="pb-8 pt-10">
          <h2 id="scripts-h" className="font-display text-h1">
            选一个年份
          </h2>
          <ScriptCards board={board} />
        </section>
        <section aria-labelledby="events-h" className="pb-16">
          <EventsCard />
        </section>
      </div>
      <Marquee />
      <div className="mx-auto max-w-[1120px] px-6 pb-10 pt-8 text-xs text-sub">
        <p className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/about" className="underline underline-offset-4 hover:text-ink">
            玩法与数据说明
          </Link>
          {board && (
            <Link href="/board/2015" className="text-gold underline underline-offset-4">
              排行榜
            </Link>
          )}
          {process.env.NEXT_PUBLIC_REPO_URL && (
            <a href={process.env.NEXT_PUBLIC_REPO_URL} className="underline underline-offset-4 hover:text-ink">
              GitHub
            </a>
          )}
        </p>
      </div>
    </main>
  );
}
