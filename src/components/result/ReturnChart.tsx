"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMotionPref } from "@/components/shell/MotionPref";
import type { BenchmarkSeries } from "@/game/engine";
import { allocSummary } from "@/game/persona";
import type { RoundRecord } from "@/game/types";

const LEGEND = [
  { name: "你", color: "var(--color-up)", dash: false },
  { name: "满仓大盘", color: "var(--color-market)", dash: false },
  { name: "全程现金", color: "var(--color-cash)", dash: true },
  { name: "散户平均", color: "var(--color-down)", dash: true },
];
const NAMES: Record<string, string> = { player: "你", market: "满仓大盘", cash: "全程现金", retail: "散户平均" };
const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`;

export function ReturnChart({ b, startCash, history = [] }: { b: BenchmarkSeries; startCash: number; history?: RoundRecord[] }) {
  const { reduce } = useMotionPref();
  const toRet = (v: number) => +((v / startCash - 1) * 100).toFixed(2);
  const last = b.labels.length - 1;
  const retail = +(b.retailAvg * 100).toFixed(1);
  const data = b.labels.map((label, i) => ({
    label,
    player: toRet(b.player[i]),
    market: toRet(b.market[i]),
    cash: toRet(b.cash[i]),
    // A single end-point (with a faint guide from 开局), not a fake curve across the year.
    retail: i === 0 ? 0 : i === last ? retail : null,
  }));
  const liquidated = (label: string) => {
    const i = b.labels.indexOf(label);
    return i > 0 && history[i - 1]?.liquidated;
  };

  return (
    <div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-sub mb-2" aria-label="图例">
        {LEGEND.map((l) => (
          <li key={l.name} className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block w-5 h-0 border-t-2" style={{ borderColor: l.color, borderStyle: l.dash ? "dashed" : "solid" }} />
            {l.name}
          </li>
        ))}
        {history.some((h) => h.liquidated) && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block w-2 h-2 rounded-full bg-[#A855F7]" />
            强平月
          </li>
        )}
      </ul>
      <div className="h-72 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 6, left: -12 }}>
            <CartesianGrid stroke="var(--color-line)" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--color-line)" }}
              tick={(p) => (
                <g transform={`translate(${p.x},${p.y})`}>
                  <text y={12} textAnchor="middle" fill="var(--color-sub)" fontSize={11}>
                    {p.payload.value}
                  </text>
                  {liquidated(p.payload.value) && <circle cy={22} r={3} fill="var(--color-bust)" />}
                </g>
              )}
              height={34}
            />
            <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: "var(--color-sub)", fontSize: 11 }} tickLine={false} axisLine={false} />
            <ReferenceLine y={0} stroke="var(--color-line-2)" />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const i = b.labels.indexOf(String(label));
                const h = i > 0 ? history[i - 1] : undefined;
                return (
                  <div className="rounded-lg border border-line bg-bg px-3 py-2 text-xs">
                    <p className="text-sub">{label}</p>
                    {LEGEND.map((l) => {
                      const key = Object.keys(NAMES).find((k) => NAMES[k] === l.name)!;
                      const v = payload.find((p) => p.dataKey === key)?.value;
                      return typeof v === "number" ? (
                        <p key={key} style={{ color: l.color }}>
                          {l.name} {signed(v)}
                        </p>
                      ) : null;
                    })}
                    {h && <p className="mt-1 pt-1 border-t border-line text-sub">{h.liquidated ? "强平 · " : ""}{allocSummary(h.alloc)}</p>}
                  </div>
                );
              }}
            />
            <Line dataKey="retail" stroke="var(--color-down)" strokeOpacity={0.35} strokeDasharray="6 5" strokeWidth={1.5} connectNulls dot={(p) =>
              p.index === last ? (
                <g key="retail-end">
                  <circle cx={p.cx} cy={p.cy} r={4} fill="var(--color-down)" />
                  <text x={p.cx} y={(p.cy ?? 0) - 10} textAnchor="end" fill="var(--color-down)" fontSize={11}>
                    散户平均 {signed(retail)}
                  </text>
                </g>
              ) : (
                <g key={`r${p.index}`} />
              )
            } activeDot={false} isAnimationActive={false} />
            {/* drawn in order: you (0.3s) → market (0.6s) → cash (0.9s), 0.5s each, overlapping by 0.2s */}
            <Line dataKey="cash" stroke="var(--color-cash)" strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={!reduce} animationBegin={900} animationDuration={500} animationEasing="ease-out" />
            <Line dataKey="market" stroke="var(--color-market)" strokeWidth={2} dot={false} isAnimationActive={!reduce} animationBegin={600} animationDuration={500} animationEasing="ease-out" />
            <Line dataKey="player" className="line-glow" stroke="var(--color-up)" strokeWidth={3} dot={{ r: 2.5 }} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 1.5 }} isAnimationActive={!reduce} animationBegin={300} animationDuration={500} animationEasing="ease-out" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
