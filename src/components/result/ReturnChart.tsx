"use client";

import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BenchmarkSeries } from "@/game/engine";

const NAMES: Record<string, string> = { player: "你", market: "满仓大盘", cash: "全程现金", retail: "散户平均" };

export function ReturnChart({ b, startCash }: { b: BenchmarkSeries; startCash: number }) {
  const toRet = (v: number) => +((v / startCash - 1) * 100).toFixed(2);
  const data = b.labels.map((label, i) => ({
    label,
    player: toRet(b.player[i]),
    market: toRet(b.market[i]),
    cash: toRet(b.cash[i]),
    retail: +(b.retailAvg * 100).toFixed(1),
  }));
  return (
    <div className="h-72 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="#232B36" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#8B95A3", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#232B36" }} />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: "#8B95A3", fontSize: 11 }} tickLine={false} axisLine={false} />
          <ReferenceLine y={0} stroke="#3a4453" />
          <Tooltip
            contentStyle={{ background: "#0B0F14", border: "1px solid #232B36", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#8B95A3" }}
            formatter={(v, name) => [`${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(1)}%`, NAMES[String(name)] ?? name]}
          />
          <Legend formatter={(v) => NAMES[v] ?? v} wrapperStyle={{ fontSize: 12 }} />
          <Line dataKey="retail" stroke="#3FB950" strokeDasharray="6 5" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line dataKey="cash" stroke="#4C8DFF" strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line dataKey="market" stroke="#8C8C8C" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="player" stroke="#FF4D4F" strokeWidth={3} dot={{ r: 2.5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
