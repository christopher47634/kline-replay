"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { allCash, allocSum } from "@/game/engine";
import { ASSET_IDS, type Allocation, type AssetId, type ScriptAsset } from "@/game/types";

const RISK_STYLE: Record<string, string> = {
  无: "bg-line text-sub",
  低: "bg-down/15 text-down",
  中: "bg-gold/15 text-gold",
  高: "bg-up/15 text-up",
  极高: "bg-up text-white",
};

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v / 5) * 5));

export interface AllocationPanelHandle {
  focusRow: (i: number) => void;
}

export const AllocationPanel = forwardRef<
  AllocationPanelHandle,
  { assets: ScriptAsset[]; value: Allocation; onChange: (a: Allocation) => void; previous: Allocation | null; onSubmit?: () => void }
>(function AllocationPanel({ assets, value, onChange, previous, onSubmit }, ref) {
  const [help, setHelp] = useState<AssetId | null>(null);
  const sliders = useRef<(HTMLInputElement | null)[]>([]);
  useImperativeHandle(ref, () => ({ focusRow: (i) => sliders.current[i]?.focus() }));
  const sum = allocSum(value);
  const set = (id: AssetId, v: number) => onChange({ ...value, [id]: clamp(v) });
  const even: Allocation = { sh50: 20, cyb: 15, bank: 20, baijiu: 15, cash: 15, margin: 15 };

  return (
    <section aria-label="分配仓位" className="rounded-xl bg-card border border-line p-4">
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
                <span className="num text-sub mr-1.5 hidden md:inline">{i + 1}</span>
                {a.name}
              </label>
              <span className={`text-[11px] px-1.5 py-0.5 rounded ${RISK_STYLE[a.risk] ?? "bg-line text-sub"}`}>{a.risk}</span>
              <button
                type="button"
                aria-label={`${a.name} 说明`}
                aria-expanded={help === a.id}
                onClick={() => setHelp(help === a.id ? null : a.id)}
                className="grid place-items-center w-5 h-5 rounded-full border border-line text-[11px] text-sub hover:text-ink hover:border-sub"
              >
                ?
              </button>
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
                className="num ml-auto w-16 h-8 rounded-md bg-bg border border-line text-right px-2 text-sm focus:outline-none focus:border-gold"
              />
              <span className="text-sub text-sm">%</span>
            </div>
            {help === a.id && <p className="mt-1.5 text-xs text-sub">{a.desc}</p>}
            <input
              id={`slider-${a.id}`}
              tabIndex={-1}
              ref={(el) => {
                sliders.current[i] = el;
              }}
              type="range"
              min={0}
              max={100}
              step={5}
              value={value[a.id]}
              onChange={(e) => set(a.id, Number(e.target.value))}
              className="hidden md:block mt-2 w-full accent-gold"
            />
            <div className="md:hidden mt-2 flex gap-1.5">
              {[0, 25, 50, 75, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => set(a.id, v)}
                  className={`num flex-1 h-8 rounded-md text-xs border ${value[a.id] === v ? "border-gold text-gold" : "border-line text-sub"}`}
                >
                  {v}
                </button>
              ))}
              <button type="button" aria-label={`${a.name} 减 5`} onClick={() => set(a.id, value[a.id] - 5)} className="w-9 h-8 rounded-md border border-line text-sub">
                −
              </button>
              <button type="button" aria-label={`${a.name} 加 5`} onClick={() => set(a.id, value[a.id] + 5)} className="w-9 h-8 rounded-md border border-line text-sub">
                +
              </button>
            </div>
            {a.id === "margin" && <p className="mt-1.5 text-xs text-up/90">2 倍杠杆，年息 8.4%，亏 50% 强平</p>}
          </li>
        ))}
      </ul>
      <div className="mt-5 pt-3 border-t border-line flex items-center justify-between text-sm">
        <span className="text-sub">合计</span>
        <span className={`num font-bold ${sum === 100 ? "text-ink" : "text-up"}`}>{sum}%</span>
      </div>
      {sum !== 100 && (
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
      className="h-8 px-3 rounded-md border border-line text-xs text-ink hover:border-sub disabled:text-sub disabled:hover:border-line disabled:cursor-not-allowed"
    />
  );
}

export const isValidAlloc = (a: Allocation) => allocSum(a) === 100 && ASSET_IDS.every((id) => a[id] >= 0);
