"use client";

import { useEffect, useMemo, useState } from "react";
import { encodeGame } from "@/game/encode";
import { gameStore } from "@/game/store";
import { buildReport, clearRecords, loadRecords, recordFor, recordGame, reportLines, tally, type StatsRecord } from "@/game/stats";
import { pct } from "@/lib/format";
import type { RoundRecord, Script } from "@/game/types";

/**
 * 本局复盘 + 跨局累计战绩。累计只记「在这台设备上刚打完的一局」（本地存档与结果码一致，或刚打完的盲盒），
 * 打开别人分享的链接不会计入；同一个结果码只记一次。数据只存在本机 localStorage。
 */
export function GameReview({ script, history, code, justPlayedBlind }: { script: Script; history: RoundRecord[]; code: string; justPlayedBlind: boolean }) {
  const report = useMemo(() => buildReport(script, history), [script, history]);
  const lines = useMemo(() => reportLines(report, (m) => script.months[m].label.replace(/^\d+ 年 /, "")), [report, script]);
  const [records, setRecords] = useState<StatsRecord[]>([]);

  useEffect(() => {
    let mine = justPlayedBlind;
    if (!mine) {
      try {
        const st = gameStore(script).getState();
        mine = st.finished && encodeGame(script.id, st.history.map((h) => h.alloc)) === code;
      } catch {
        mine = false;
      }
    }
    setRecords(mine ? recordGame(recordFor(script, history, code, Date.now())) : loadRecords());
  }, [script, history, code, justPlayedBlind]);

  const t = useMemo(() => tally(records), [records]);

  return (
    <section aria-label="本局复盘与累计战绩" className="card-surface mt-6 grid gap-6 p-5 md:grid-cols-2 md:p-7" data-testid="game-review">
      <div>
        <p className="text-sm text-sub">本局复盘</p>
        <ul className="mt-3 space-y-1.5 text-sm md:text-base">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
      <div data-testid="stats-total">
        <p className="text-sm text-sub">累计战绩（仅存在本机）</p>
        {t.games === 0 ? (
          <p className="mt-3 text-sm text-sub">还没有记录。自己打完一局后，这里会累计胜率和平均收益。</p>
        ) : (
          <>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-sub">局数</dt>
              <dd className="num font-bold">{t.games}</dd>
              <dt className="text-sub">胜率（收益为正）</dt>
              <dd className="num font-bold">{(t.winRate * 100).toFixed(0)}%</dd>
              <dt className="text-sub">跑赢满仓大盘</dt>
              <dd className="num font-bold">{(t.beatMarketRate * 100).toFixed(0)}%</dd>
              <dt className="text-sub">平均收益</dt>
              <dd className="num font-bold">{pct(t.avgReturn)}</dd>
              <dt className="text-sub">最好 / 最差</dt>
              <dd className="num font-bold">
                {pct(t.bestReturn)} / {pct(t.worstReturn)}
              </dd>
              <dt className="text-sub">爆仓 / 强平</dt>
              <dd className="num font-bold">
                {t.busts} / {t.liquidations}
              </dd>
            </dl>
            <button
              type="button"
              className="mt-3 text-xs text-sub underline hover:text-ink"
              onClick={() => {
                clearRecords();
                setRecords([]);
              }}
            >
              清空累计战绩
            </button>
          </>
        )}
      </div>
    </section>
  );
}
