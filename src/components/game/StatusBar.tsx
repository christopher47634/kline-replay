import { pct, upDownColor, yuan } from "@/lib/format";
import { RollingNumber } from "./RollingNumber";

export function StatusBar({
  round,
  total,
  label,
  cash,
  startCash,
  lastPnl,
}: {
  round: number;
  total: number;
  label: string;
  cash: number;
  startCash: number;
  lastPnl: number | null;
}) {
  const totalRet = cash / startCash - 1;
  const monthOnly = label.replace(/^\d+ 年 /, "");
  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 bg-bg/90 backdrop-blur border-b border-line">
      {/* Phone: one fixed 44px line so the bar never eats into the cards below. */}
      <div className="md:hidden h-11 flex items-center justify-between gap-2 text-sm whitespace-nowrap overflow-hidden" data-testid="status-compact">
        <span>
          第 <b className="num">{round}</b> 回合 · {monthOnly}
        </span>
        <span className="flex items-center gap-2">
          <RollingNumber value={cash} format={yuan} className="font-bold" />
          <span className={`num font-bold ${upDownColor(totalRet)}`}>{pct(totalRet)}</span>
        </span>
      </div>
      <div className="hidden md:flex flex-wrap items-center gap-x-5 gap-y-1 text-sm py-3">
        <span>
          第 <b className="num text-ink text-base">{round}</b> 回合 <span className="text-sub num">/ {total}</span>
        </span>
        <span className="text-sub">｜</span>
        <span className="font-medium">{label}</span>
        <span className="text-sub">｜</span>
        <span>
          <span className="text-sub">总资产 </span>
          <RollingNumber value={cash} format={yuan} className="text-base font-bold" />
        </span>
        {lastPnl !== null && (
          <>
            <span className="text-sub">｜</span>
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
