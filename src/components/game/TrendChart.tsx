"use client";

import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RoundRecord, Script } from "@/game/types";

/**
 * Month-end index (开局 = 100) of the market and the player, drawn only up to last month.
 * The two months before the start (previous Nov/Dec) are drawn as a faded gray line so round 1
 * has context; 开局 is the previous December's close.
 */
export function TrendChart({ script, history }: { script: Script; history: RoundRecord[] }) {
  const known = history.length; // month-ends revealed so far
  const pre = script.preMonths ?? [];
  const nPre = pre.length === 2 ? 2 : 0; // points before 开局: Nov start, Nov end
  const labels = [...(nPre ? ["去11月初", "去12月初"] : []), "开局", ...script.months.map((m) => `${m.index + 1}月`)];
  // Back-compute the pre-start index: 开局 = 100, so Nov-end = 100 / (1 + Dec return), and so on.
  const preVals: number[] = [];
  if (nPre === 2) {
    const novEnd = 100 / (1 + pre[1].marketReturn);
    preVals.push(novEnd / (1 + pre[0].marketReturn), novEnd);
  }
  let mkt = 100;
  const data = labels.map((label, i) => {
    const k = i - nPre; // index of the point relative to 开局 (k = 0 is 开局)
    if (k < 0) return { label, market: null, pre: +preVals[i].toFixed(2), player: null };
    if (k > 0) mkt *= 1 + script.months[k - 1].marketReturn;
    return {
      label,
      market: k <= known ? +mkt.toFixed(2) : null,
      pre: k === 0 ? 100 : null,
      player: k <= known ? +(((k === 0 ? script.startCash : history[k - 1].cashAfter) / script.startCash) * 100).toFixed(2) : null,
    };
  });
  const visible = data.flatMap((d) => [d.market, d.pre, d.player].filter((v): v is number => v !== null));
  const lo = Math.floor(Math.min(90, ...visible) / 10) * 10;
  const hi = Math.ceil(Math.max(110, ...visible) / 10) * 10;

  return (
    <section aria-label="走势" className="flex-1 flex flex-col rounded-xl bg-card border border-line p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">走势</h2>
        <span className="text-xs text-sub">起点 = 100，月末值</span>
      </div>
      <div className="mt-2 h-64 md:h-auto md:min-h-64 md:flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -18 }}>
            <defs>
              <pattern id="future-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="8" height="8" fill="#0D1117" />
                <line x1="0" y1="0" x2="0" y2="8" stroke="#2c3542" strokeWidth="3" />
              </pattern>
            </defs>
            <CartesianGrid stroke="#1C2431" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#8B95A3", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#1C2431" }} interval={1} />
            <YAxis domain={[lo, hi]} tick={{ fill: "#8B95A3", fontSize: 11, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} />
            {known < 12 && (
              <ReferenceArea
                x1={labels[nPre + known]}
                x2={labels[nPre + 12]}
                fill="url(#future-hatch)"
                fillOpacity={1}
                ifOverflow="extendDomain"
                label={{ value: "未来不可见", fill: "#8B95A3", fontSize: 13, position: "center" }}
              />
            )}
            {nPre > 0 && <ReferenceLine x="开局" stroke="#F5B400" strokeDasharray="3 3" label={{ value: "开局", fill: "#F5B400", fontSize: 11, position: "insideTopRight" }} />}
            <Tooltip
              contentStyle={{ background: "#07090D", border: "1px solid #1C2431", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#8B95A3" }}
              formatter={(v, name) => [typeof v === "number" ? v.toFixed(1) : "—", name === "player" ? "你" : name === "pre" ? "开局前大盘" : "上证综指"]}
            />
            <Legend formatter={(v) => (v === "player" ? "你" : v === "pre" ? "开局前大盘" : "上证综指")} wrapperStyle={{ fontSize: 12, color: "#8B95A3" }} />
            <Line type="linear" dataKey="pre" stroke="#8C8C8C" strokeOpacity={0.6} strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls />
            <Line type="linear" dataKey="market" stroke="#8C8C8C" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls={false} />
            <Line type="linear" dataKey="player" stroke="#FF4D4F" strokeWidth={2.5} dot={{ r: 2.5 }} isAnimationActive={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
