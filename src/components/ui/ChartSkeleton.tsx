"use client";

/** Placeholder while a chart chunk loads: a faint skeleton line, not a grey block. */
export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="card-surface flex-1 p-4" style={{ minHeight: height }} aria-busy="true" aria-label="图表加载中">
      <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="h-full w-full animate-pulse" style={{ minHeight: height - 32 }}>
        <path d="M0 80 L30 70 L60 74 L90 55 L120 60 L150 40 L180 46 L210 30 L240 38 L270 20 L300 26" fill="none" stroke="#1C2431" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
