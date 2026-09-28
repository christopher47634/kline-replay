import Image from "next/image";

export function HeadlineCard({ text }: { text: string }) {
  return (
    <article className="fade-in rounded-xl bg-card border border-line pl-4 pr-4 py-3 relative overflow-hidden">
      <span aria-hidden className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-up" />
      <p className="font-bold leading-snug text-[15px]">{text}</p>
      <p className="mt-1.5 text-xs text-sub">财经日报</p>
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
