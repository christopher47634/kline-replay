"use client";

import { m as motion, useAnimationControls, useMotionValue, useSpring, useTransform } from "motion/react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useMotionPref } from "@/components/shell/MotionPref";
import { allCash, allocSum } from "@/game/engine";
import { ASSET_IDS, type Allocation, type AssetId, type ScriptAsset } from "@/game/types";
import { tick } from "@/lib/sfx";

const RISK_STYLE: Record<string, string> = {
  无: "bg-line text-sub",
  低: "bg-down/15 text-down",
  中: "bg-gold/15 text-gold",
  高: "bg-up/15 text-up",
  极高: "bg-up text-white",
};
/** Track fill colour follows the asset's risk level. */
const RISK_FILL: Record<string, string> = { 无: "var(--color-sub)", 低: "var(--color-down)", 中: "var(--color-gold)", 高: "var(--color-up)", 极高: "var(--color-bust)" };

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v / 5) * 5));

export interface AllocationPanelHandle {
  focusRow: (i: number) => void;
}

/**
 * A slider whose visuals follow the value through a spring (stiffness 400 / damping 30), so the thumb has weight.
 * The real <input type="range"> stays on top, invisible, for pointer, touch and keyboard access.
 */
const DampedSlider = forwardRef<HTMLInputElement, { id: string; value: number; color: string; onChange: (v: number) => void }>(function DampedSlider({ id, value, color, onChange }, ref) {
  const { reduce } = useMotionPref();
  const target = useMotionValue(value);
  const spring = useSpring(target, { stiffness: 400, damping: 30 });
  const shown = reduce ? target : spring;
  const width = useTransform(shown, (v) => `${v}%`);
  const left = useTransform(shown, (v) => `calc(${v}% - ${(v / 100) * 16}px)`);
  useEffect(() => target.set(value), [value, target]);

  return (
    <div className="relative mt-2 hidden h-6 md:block">
      <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-bg" />
      <motion.div className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full" style={{ width, background: color }} />
      <motion.div className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-bg" style={{ left, background: color, boxShadow: `0 0 0 1px ${color}, 0 0 10px ${color}66` }} />
      <input
        id={id}
        ref={ref}
        tabIndex={-1}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
});

export const AllocationPanel = forwardRef<
  AllocationPanelHandle,
  { assets: ScriptAsset[]; value: Allocation; onChange: (a: Allocation) => void; previous: Allocation | null; onSubmit?: () => void }
>(function AllocationPanel({ assets, value, onChange, previous, onSubmit }, ref) {
  const sliders = useRef<(HTMLInputElement | null)[]>([]);
  const [help, setHelp] = useState<AssetId | null>(null);
  const { reduce } = useMotionPref();
  const totalCtl = useAnimationControls();
  useImperativeHandle(ref, () => ({ focusRow: (i) => sliders.current[i]?.focus() }));
  const sum = allocSum(value);
  const ok = sum === 100;
  const wasOk = useRef(ok);

  // Total feedback: pop once when it lands on 100, a 2px shake when it leaves 100.
  useEffect(() => {
    if (reduce || wasOk.current === ok) return;
    wasOk.current = ok;
    void totalCtl.start(ok ? { scale: [1, 1.08, 1], transition: { duration: 0.3 } } : { x: [0, -2, 2, -2, 0], transition: { duration: 0.3 } });
  }, [ok, reduce, totalCtl]);

  const set = (id: AssetId, v: number) => {
    const next = clamp(v);
    if (next !== value[id]) tick(); // one tick + 10ms buzz per step crossed
    onChange({ ...value, [id]: next });
  };
  const even: Allocation = { sh50: 20, cyb: 15, bank: 20, baijiu: 15, cash: 15, margin: 15 };

  return (
    <section aria-label="分配仓位" className="card-surface p-4">
      <h2 className="font-bold">分配仓位</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <QuickBtn onClick={() => previous && onChange(previous)} disabled={!previous}>
          同上月
        </QuickBtn>
        <QuickBtn onClick={() => onChange(allCash())}>全部现金</QuickBtn>
        <QuickBtn onClick={() => onChange(even)}>平均分配</QuickBtn>
      </div>
      <ul className="mt-4 space-y-4">
        {assets.map((a, i) => (
          <li key={a.id}>
            <div className="flex items-center gap-2">
              <label htmlFor={`slider-${a.id}`} className="text-sm font-medium">
                <span className="num mr-1.5 hidden text-sub md:inline">{i + 1}</span>
                {a.name}
              </label>
              <span className={`rounded px-1.5 py-0.5 text-[11px] ${RISK_STYLE[a.risk] ?? "bg-line text-sub"}`}>{a.risk}</span>
              <button
                type="button"
                aria-label={`${a.name} 说明`}
                aria-expanded={help === a.id}
                onClick={() => setHelp(help === a.id ? null : a.id)}
                className="grid h-5 w-5 place-items-center rounded-full border border-line text-[11px] text-sub hover:border-sub hover:text-ink"
              >
                ?
              </button>
              <span className="group relative ml-auto">
                <input
                  aria-label={`${a.name} 百分比`}
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={value[a.id]}
                  onChange={(e) => set(a.id, Number(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSubmit?.();
                    }
                  }}
                  className="num h-8 w-16 rounded-md border border-line bg-bg px-2 text-right text-sm focus:outline-none"
                />
                {/* gold underline grows from the middle on focus */}
                <span aria-hidden className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 origin-center scale-x-0 bg-gold transition-transform duration-200 group-focus-within:scale-x-100" />
              </span>
              <span className="text-sm text-sub">%</span>
            </div>
            {help === a.id && <p className="mt-1.5 text-xs text-sub">{a.desc}</p>}
            <DampedSlider
              id={`slider-${a.id}`}
              ref={(el) => {
                sliders.current[i] = el;
              }}
              value={value[a.id]}
              color={RISK_FILL[a.risk] ?? "var(--color-sub)"}
              onChange={(v) => set(a.id, v)}
            />
            <div className="mt-2 flex gap-1.5 md:hidden">
              {[0, 25, 50, 75, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set(a.id, v)}
                  className={`num h-8 flex-1 rounded-md border text-xs transition-transform active:scale-[0.94] ${value[a.id] === v ? "border-gold text-gold" : "border-line text-sub"}`}
                >
                  {v}
                </button>
              ))}
              <button type="button" aria-label={`${a.name} 减 5`} onClick={() => set(a.id, value[a.id] - 5)} className="h-8 w-9 rounded-md border border-line text-sub transition-transform active:scale-[0.94]">
                −
              </button>
              <button type="button" aria-label={`${a.name} 加 5`} onClick={() => set(a.id, value[a.id] + 5)} className="h-8 w-9 rounded-md border border-line text-sub transition-transform active:scale-[0.94]">
                +
              </button>
            </div>
            {a.id === "margin" && value.margin > 0 && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-up/90">
                <span aria-hidden className={reduce ? "" : "animate-pulse"}>
                  ⚠
                </span>
                2 倍杠杆，年息 8.4%，亏 50% 强平
              </p>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center justify-between border-t border-line pt-3 text-sm">
        <span className="text-sub">合计</span>
        <motion.span animate={totalCtl} className={`num inline-block font-bold ${ok ? "text-ink" : "text-up"}`}>
          {sum}%
        </motion.span>
      </div>
      {!ok && (
        <p role="alert" className="mt-1 text-xs text-up">
          合计需为 100%（{sum > 100 ? `多了 ${sum - 100}%` : `还差 ${100 - sum}%`}）
        </p>
      )}
    </section>
  );
});

function QuickBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="h-8 rounded-md border border-line px-3 text-xs text-ink transition-transform hover:border-sub active:scale-[0.96] disabled:cursor-not-allowed disabled:text-sub disabled:hover:border-line"
    />
  );
}

export const isValidAlloc = (a: Allocation) => allocSum(a) === 100 && ASSET_IDS.every((id) => a[id] >= 0);
