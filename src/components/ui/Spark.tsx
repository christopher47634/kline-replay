/** Tiny line chart: `hi` is the highlighted point, `base` a dashed reference line (0 or 50). */
export function Spark({ rows, hi = rows.length - 1, base = null, big = false, future = 0 }: { rows: number[]; hi?: number; base?: number | null; big?: boolean; future?: number }) {
  const W = big ? 320 : 120;
  const H = big ? 110 : 34;
  const P = big ? 8 : 3;
  const vals = base === null ? rows : [...rows, base];
  const lo = Math.min(...vals);
  const hiV = Math.max(...vals);
  const span = hiV - lo || 1;
  const total = rows.length + future;
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, total - 1);
  const y = (v: number) => P + (H - 2 * P) * (1 - (v - lo) / span);
  const pts = rows.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <span className={`spark${big ? " spark-big" : ""}`} aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`}>
        {base !== null && <line x1={P} x2={W - P} y1={y(base)} y2={y(base)} className="spark-base" />}
        {future > 0 && rows.length > 0 && <line x1={x(rows.length - 1)} x2={W - P} y1={y(rows[rows.length - 1])} y2={y(rows[rows.length - 1])} className="spark-future" />}
        <polyline points={pts} className="spark-line" />
        {hi >= 0 && hi < rows.length && <circle cx={x(hi)} cy={y(rows[hi])} r={big ? 4 : 2.6} className="spark-dot" />}
      </svg>
    </span>
  );
}
