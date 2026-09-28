"use client";

import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RoundRecord, Script } from "@/game/types";

/** Month-end index (start = 100) of the market and the player, drawn only up to last month. */
export function TrendChart({ script, history }: { script: Script; history: RoundRecord[] }) {
  const known = history.length; // month-ends revealed so far
  const labels = ["开局", ...script.months.map((m) => `${m.index + 1}月`)];
  let mkt = 100;
  const data = labels.map((label, i) => {
    if (i > 0) mkt *= 1 + script.months[i - 1].marketReturn;
    return {
      label,
      market: i <= known ? +mkt.toFixed(2) : null,
      player: i <= known ? +(((i === 0 ? script.startCash : history[i - 1].cashAfter) / script.startCash) * 100).toFixed(2) : null,
    };
  });
  const visible = data.filter((d) => d.market !== null).flatMap((d) => [d.market!, d.player!]);
  const lo = Math.floor(Math.min(90, ...visible) / 10) * 10;
  const hi = Math.ceil(Math.max(110, ...visible) / 10) * 10;

  return (
    <section aria-label="走势" className="self-start rounded-xl bg-card border border-line p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">走势</h2>
        <span className="text-xs text-sub">起点 = 100，月末值</span>
      </div>
      <div className="mt-2 h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <defs>
              <pattern id="future-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="8" height="8" fill="#141A22" />
                <line x1="0" y1="0" x2="0" y2="8" stroke="#2c3542" strokeWidth="3" />
              </pattern>
            </defs>
            <CartesianGrid stroke="#232B36" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#8B95A3", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#232B36" }} interval={1} />
            <YAxis domain={[lo, hi]} tick={{ fill: "#8B95A3", fontSize: 11, fontFamily: "var(--font-mono)" }} tickLine={false} axisLine={false} />
            {known < 12 && (
              <ReferenceArea
                x1={labels[known]}
                x2={labels[12]}
                fill="url(#future-hatch)"
                fillOpacity={1}
                ifOverflow="extendDomain"
                label={{ value: "未来不可见", fill: "#8B95A3", fontSize: 13, position: "center" }}
              />
            )}
            <Tooltip
              contentStyle={{ background: "#0B0F14", border: "1px solid #232B36", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#8B95A3" }}
              formatter={(v, name) => [typeof v === "number" ? v.toFixed(1) : "—", name === "player" ? "你" : "上证综指"]}
            />
            <Legend formatter={(v) => (v === "player" ? "你" : "上证综指")} wrapperStyle={{ fontSize: 12, color: "#8B95A3" }} />
            <Line type="linear" dataKey="market" stroke="#8C8C8C" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls={false} />
            <Line type="linear" dataKey="player" stroke="#FF4D4F" strokeWidth={2.5} dot={{ r: 2.5 }} isAnimationActive={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
