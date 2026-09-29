import Image from "next/image";
import type { Headline, Tone } from "@/game/types";

const BAR: Record<Tone, string> = { bull: "bg-up", bear: "bg-down", neutral: "bg-sub" };
const TONE_LABEL: Record<Tone, string> = { bull: "偏多", bear: "偏空", neutral: "中性" };

/** A headline: tone-colored bar, outlet, and a date stamp in the (already past) previous month. */
export function HeadlineCard({ headline, lead, monthNo }: { headline: Headline; lead?: boolean; monthNo: number }) {
  return (
    <article className="fade-in rounded-xl bg-card border border-line pl-4 pr-4 py-3 relative overflow-hidden">
      <span aria-hidden className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r ${BAR[headline.tone]}`} />
      <div className="flex items-center gap-2 text-xs text-sub">
        {lead && <span className="px-1.5 py-0.5 rounded bg-up/15 text-up font-medium">头条</span>}
        <span>{headline.outlet}</span>
        <span className="ml-auto num">
          {monthNo}月{headline.day}日
        </span>
      </div>
      <p className={`mt-1.5 font-bold leading-snug ${lead ? "text-[17px]" : "text-[15px]"}`}>{headline.text}</p>
      <span className="sr-only">{TONE_LABEL[headline.tone]}</span>
    </article>
  );
}

export function RumorCard({ text }: { text: string }) {
  return (
    <article className="fade-in rounded-xl bg-card border border-dashed border-line p-4">
      <div className="flex items-center gap-3">
        <Image src="/avatars/laoge.svg" alt="" width={36} height={36} className="rounded-full" />
        <span className="font-medium text-sm">股吧老哥</span>
        <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-gold/15 text-gold">小道消息</span>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed">“{text}”</p>
      <p className="mt-2 text-xs text-sub">可能是真的，也可能是噪音</p>
    </article>
  );
}
