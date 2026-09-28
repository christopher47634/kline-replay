import { pct, upDownColor, yuan } from "@/lib/format";
import { RollingNumber } from "./RollingNumber";

export function StatusBar({ round, total, label, cash, lastPnl }: { round: number; total: number; label: string; cash: number; lastPnl: number | null }) {
  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-bg/90 backdrop-blur border-b border-line">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <span>
          第 <b className="num text-ink text-base">{round}</b> 回合 <span className="text-sub num">/ {total}</span>
        </span>
        <span className="text-sub hidden sm:inline">｜</span>
        <span className="font-medium">{label}</span>
        <span className="text-sub hidden sm:inline">｜</span>
        <span>
          <span className="text-sub">总资产 </span>
          <RollingNumber value={cash} format={yuan} className="text-base font-bold" />
        </span>
        {lastPnl !== null && (
          <>
            <span className="text-sub hidden sm:inline">｜</span>
            <span>
              <span className="text-sub">上月 </span>
              <span className={`num font-bold ${upDownColor(lastPnl)}`}>{pct(lastPnl)}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
