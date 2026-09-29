import type { Script, TradedId } from "@/game/types";
import { pct, upDownColor } from "@/lib/format";

const ROWS: TradedId[] = ["sh50", "cyb", "bank", "baijiu"];

/** Last month's move per asset: already-known information, so it never spoils the coming month. */
export function KnownInfo({ script, round }: { script: Script; round: number }) {
  const prev = round === 0 ? script.preMonths.at(-1) : script.months[round - 1];
  if (!prev) return null;
  const rets = ROWS.map((id) => prev.returns[id]);
  const scale = Math.max(0.1, ...rets.map(Math.abs));
  const monthNo = round === 0 ? 12 : round;
  return (
    <section aria-label="本月已知信息" className="rounded-xl bg-card border border-line p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">本月已知信息</h2>
        <span className="text-xs text-sub">{monthNo} 月各资产涨跌</span>
      </div>
      <ul className="mt-3 space-y-2">
        {ROWS.map((id, k) => {
          const name = script.assets.find((a) => a.id === id)?.name ?? id;
          const r = rets[k];
          return (
            <li key={id} className="flex items-center gap-2 text-sm">
              <span className="w-24 shrink-0 text-sub truncate">{name}</span>
              <span className="relative flex-1 h-2 rounded bg-bg">
                <span aria-hidden className="absolute top-0 bottom-0 left-1/2 w-px bg-line" />
                <span
                  aria-hidden
                  className={`absolute top-0 bottom-0 rounded ${r >= 0 ? "bg-up left-1/2" : "bg-down right-1/2"}`}
                  style={{ width: `${(Math.min(1, Math.abs(r) / scale) * 50).toFixed(1)}%` }}
                />
              </span>
              <span className={`w-16 text-right num ${upDownColor(r)}`}>{pct(r)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
