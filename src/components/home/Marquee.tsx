import marquee from "@/components/hero/marquee.json";

/** Endless headline ticker (40px/s, pauses on hover). Pure CSS: two copies side by side, translated by -50%. */
export function Marquee() {
  const items = [...marquee, ...marquee];
  return (
    <div className="marquee group relative overflow-hidden border-y border-line py-3" aria-label="2015 年的十二条头条" role="marquee">
      <div className="marquee-track flex w-max gap-10 whitespace-nowrap text-sm text-sub group-hover:[animation-play-state:paused]">
        {items.map((m, i) => (
          <span key={i} aria-hidden={i >= marquee.length}>
            <span className="num mr-2 text-gold/80">{m.day}</span>
            {m.text}
          </span>
        ))}
      </div>
    </div>
  );
}
