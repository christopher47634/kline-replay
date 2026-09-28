"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Script } from "@/game/types";

/** Opening card with a typewriter intro; clicking anywhere on the text skips the effect. */
export function Intro({ script, onStart }: { script: Script; onStart: () => void }) {
  const [n, setN] = useState(0);
  const full = script.intro;
  useEffect(() => {
    if (n >= full.length) return;
    const t = setTimeout(() => setN((v) => v + 1), 28);
    return () => clearTimeout(t);
  }, [n, full.length]);

  return (
    <main className="mx-auto max-w-[680px] px-4 py-16 md:py-24">
      <p className="text-sm text-gold">{script.subtitle}</p>
      <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight">{script.title}</h1>
      <p className="mt-8 text-lg leading-loose min-h-[8.5rem] cursor-pointer" onClick={() => setN(full.length)}>
        {full.slice(0, n)}
        {n < full.length && <span className="inline-block w-2 h-5 align-middle bg-ink/70 animate-pulse ml-0.5" />}
      </p>
      <ul className="mt-8 space-y-2 text-sm text-sub">
        <li>· 起始资金 <span className="num text-ink">¥ 100,000</span>，共 12 回合，每回合 1 个月</li>
        <li>· 每月的涨跌来自真实历史行情，头条基于当月初已发生的真实事件</li>
        <li>· 小道消息一半是信号、一半是噪音，自己判断</li>
      </ul>
      <Button className="mt-10 h-12 px-8 text-base" onClick={onStart} autoFocus>
        开始第 1 回合 →
      </Button>
    </main>
  );
}
