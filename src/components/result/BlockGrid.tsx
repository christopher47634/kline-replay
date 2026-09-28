import type { RoundRecord, Script } from "@/game/types";
import { pct, shortMonth } from "@/lib/format";

export function BlockGrid({ script, history }: { script: Script; history: RoundRecord[] }) {
  return (
    <ol aria-label="每月盈亏方块" className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
      {history.map((h) => {
        const kind = h.liquidated ? "强平" : h.pnl >= 0 ? "盈" : "亏";
        const color = h.liquidated ? "bg-[#A855F7]" : h.pnl >= 0 ? "bg-up" : "bg-down";
        const tip = `${shortMonth(script.months[h.month].label)} ${pct(h.pnl)}${h.liquidated ? "（强平）" : ""}`;
        return (
          <li key={h.month} data-testid="block" title={tip} className="group relative">
            <span className={`block aspect-square rounded-md ${color}`} aria-label={`${tip}，${kind}`} />
            <span className="pointer-events-none absolute z-10 left-1/2 -translate-x-1/2 -top-9 whitespace-nowrap rounded bg-bg border border-line px-2 py-1 text-xs num opacity-0 group-hover:opacity-100 transition-opacity">
              {tip}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
