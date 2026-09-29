import { pct } from "@/lib/format";

const CELLS = ["#1F7A35", "#3E6B48", "#4B5563", "#8A4B4E", "#C93A3D"];

/** 0..4 bucket of last month's market return: <=-8% / -8~-2 / -2~2 / 2~8 / >=8%. */
export function tempLevel(r: number): number {
  if (r <= -0.08) return 0;
  if (r < -0.02) return 1;
  if (r <= 0.02) return 2;
  if (r < 0.08) return 3;
  return 4;
}

export function Thermometer({ ret, monthNo }: { ret: number; monthNo: number }) {
  const level = tempLevel(ret);
  return (
    <div className="flex items-center gap-3 text-xs text-sub" data-testid="thermo">
      <span className="shrink-0">上月市场温度</span>
      <div className="flex gap-1 flex-1" role="img" aria-label={`上月大盘 ${pct(ret)}`}>
        {CELLS.map((c, i) => (
          <span key={c} className="h-3 flex-1 rounded-sm" style={{ background: c, opacity: i === level ? 1 : 0.28, outline: i === level ? "1.5px solid #E6E8EB" : "none", outlineOffset: 1 }} />
        ))}
      </div>
      <span className="shrink-0 num text-ink">
        {monthNo}月大盘 {pct(ret)}
      </span>
    </div>
  );
}
