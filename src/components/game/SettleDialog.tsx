"use client";

import { m as motion } from "motion/react";
import { useEffect, useState } from "react";
import { Odometer } from "@/components/motion/Odometer";
import { Reveal } from "@/components/motion/Reveal";
import { useMotionPref } from "@/components/shell/MotionPref";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { fetchComment, templateComment } from "@/lib/comment";
import { pct, upDownColor, yuan } from "@/lib/format";
import { haptic, play } from "@/lib/sfx";
import type { LastSettle } from "@/game/store";
import { ASSET_IDS, type MonthNote, type Script } from "@/game/types";
import { useResolved } from "@/lib/prefs";
import { plainSettle, proSettle, settleFacts } from "@/lib/voice";
import { dueThisRound } from "@/lib/macro";
import { celebrate } from "@/lib/celebrate";
import { rumorFacts } from "@/game/rumor";

const signedPct = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`;

/** Types the veteran's comment at 18ms per character (instantly under reduced motion). */
function TypedComment({ text }: { text: string }) {
  const { reduce } = useMotionPref();
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) return setN(text.length);
    setN(0);
    const iv = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(iv), v) : v + 1)), 18);
    return () => clearInterval(iv);
  }, [text, reduce]);
  return (
    <p aria-label={text}>
      <span aria-hidden>{text.slice(0, n)}</span>
    </p>
  );
}

export function SettleDialog({ script, last, open, onClose, isFinal, note }: { script: Script; last: LastSettle | null; open: boolean; onClose: () => void; isFinal: boolean; note?: MonthNote }) {
  const { reduce } = useMotionPref();
  const { voice } = useResolved();
  const [comment, setComment] = useState<string | null>(null);
  const [glow, setGlow] = useState(false);

  useEffect(() => {
    if (!open || !last) return;
    play("flip"); // the dialog rises with a paper-turn sound
    let alive = true;
    setComment(null);
    setGlow(false);
    if (voice !== "standard") return; // the veteran's comment belongs to the standard voice only
    const req = {
      scriptId: script.id,
      month: last.month,
      allocBefore: last.allocBefore,
      allocAfter: last.alloc,
      pnl: last.pnl,
      marketReturn: script.months[last.month].marketReturn,
    };
    // 盲盒: the live AI comment knows the year and might say it; use the local templates instead
    if (script.blind) setComment(templateComment(req));
    else fetchComment(req).then((t) => alive && setComment(t));
    return () => {
      alive = false;
    };
  }, [open, last, script, voice]);

  if (!last) return <Dialog open={false} onClose={onClose} label="本月结算">{null}</Dialog>;
  const month = script.months[last.month];
  const names = Object.fromEntries(script.assets.map((a) => [a.id, a.name]));
  const rows = ASSET_IDS.filter((id) => last.alloc[id] > 0).map((id) => {
    const start = last.cashBefore * (last.alloc[id] / 100);
    return { id, name: names[id], gain: last.parts[id] - start, ret: start > 0 ? last.parts[id] / start - 1 : 0 };
  });

  // The big number lands: outer glow once (0.3s) + the up / down sound and a buzz.
  const landed = () => {
    setGlow(true);
    setTimeout(() => setGlow(false), 300);
    if (last.liquidated) return; // the bust sound already played with the screen effects
    play(last.pnl >= 0 ? "up" : "down");
    haptic("settle");
    if (last.pnl >= 0.06) void celebrate("month", document.querySelector("[data-testid='settle-pnl']"));
  };
  const glowColor = last.pnl >= 0 ? "var(--color-up-glow)" : "var(--color-down-glow)";

  return (
    <Dialog open={open} onClose={onClose} label="本月结算" originSelector="[data-testid='next-month']" className={last.liquidated ? "!border-up border-2 bust-glow" : ""}>
      <div className="p-5 sm:p-6">
        <p className="text-sm text-sub">{month.label} · 结算</p>
        <h2 className={`mt-1 text-xl font-bold ${last.liquidated ? "text-up" : ""}`}>{last.liquidated ? "融资仓位被强平" : "本月盈亏"}</h2>
        <p className={`mt-3 text-5xl font-black tracking-tight ${upDownColor(last.pnl)}`} style={{ textShadow: glow ? `0 0 24px ${glowColor}, 0 0 4px ${glowColor}` : "none", transition: "text-shadow 150ms" }} data-testid="settle-pnl">
          <Odometer value={last.pnl * 100} format={signedPct} duration={900} from={0} className="num" onDone={landed} />
        </p>
        <p className="num mt-1 text-sm text-sub">
          {yuan(last.cashBefore)} → <span className="text-ink">{yuan(last.cashAfter)}</span>
        </p>

        {voice === "standard" && <ul className="mt-5 divide-y divide-line border-y border-line">
          {rows.map((r, i) => (
            <motion.li
              key={r.id}
              initial={reduce ? false : { opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reduce ? 0 : 0.3 + i * 0.04, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span>
                {r.name} <span className="num text-sub">{last.alloc[r.id]}%</span>
              </span>
              <span className={`num ${upDownColor(r.gain)}`}>
                {r.id === "margin" && last.liquidated ? "强平归零" : pct(r.ret)}{" "}
                <span className="text-sub">
                  (<Odometer value={Math.abs(r.gain)} format={(n) => `${r.gain >= 0 ? "+" : "−"}${Math.round(n).toLocaleString("en-US")}`} duration={700} />)
                </span>
              </span>
            </motion.li>
          ))}
        </ul>}

        <RumorCheck script={script} last={last} note={note} />

        {voice === "plain" && <PlainBlock script={script} last={last} />}
        {voice === "pro" && <ProBlock script={script} last={last} />}

        {voice === "standard" && <>
        <div className="mt-4 rounded-lg bg-bg p-3 text-sm leading-relaxed" data-prose>
          <p className="mb-1 text-xs text-sub">事后复盘</p>
          <Reveal as="p" delay={0.5}>
            {month.hindsight}
          </Reveal>
        </div>
        <div className="mt-3 flex min-h-10 items-start gap-3 text-sm">
          <span className="shrink-0 pt-0.5 text-xs text-sub">老股民说</span>
          {comment ? <TypedComment text={comment} /> : <span aria-label="点评加载中" className="mt-0.5 h-4 w-2/3 animate-pulse rounded bg-line" />}
        </div>
        </>}

        <Button className="mt-6 h-11 w-full" onClick={onClose} autoFocus>
          {isFinal ? "查看年终结算 →" : "进入下个月 →"}
        </Button>
      </div>
    </Dialog>
  );
}

/**
 * 小道消息复盘：三件事分开回答，不混成一句「信对了」——
 * 消息有没有成真（世界的事实）、它指的方向本月有没有走出来（价格的事实）、你有没有照着它调仓（你的事实）。
 */
function RumorCheck({ script, last, note }: { script: Script; last: LastSettle; note?: MonthNote }) {
  const f = rumorFacts(script, last);
  const stance = note?.rumor === "trust" ? "你说更相信它" : note?.rumor === "doubt" ? "你没采信它" : null;
  const what = f.call ? `看${f.call.dir > 0 ? "涨" : "跌"}${f.target}` : null;
  return (
    <div className="mt-4 rounded-lg border border-dashed border-line p-3 text-sm" data-testid="rumor-check">
      <p className="mb-1.5 flex items-center justify-between text-xs text-sub">
        <span>小道消息复盘</span>
        {stance && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-gold">{stance}</span>}
      </p>
      <ul className="space-y-1">
        <li>
          <b className={f.came ? "text-ink" : "text-sub"}>{f.came ? "成真了" : "没兑现"}</b>
          <span className="text-sub"> · 消息本身{f.came ? "后来被证实" : "是噪音"}</span>
        </li>
        <li>
          {f.call ? (
            <>
              <b className={f.same ? "text-ink" : "text-sub"}>{f.same ? "方向对了" : "方向反了"}</b>
              <span className="text-sub">
                {" "}
                · 它{what}，本月{f.target}实际 <span className={`num ${upDownColor(f.ret!)}`}>{pct(f.ret!)}</span>
              </span>
            </>
          ) : (
            <span className="text-sub">它说的是一件事，没有指明涨跌方向</span>
          )}
        </li>
        {f.call && (
          <li className="text-sub">
            {f.acted === "with" ? "你照着它的方向调了仓" : f.acted === "against" ? "你的仓位往相反方向走了" : "你没有为它调仓"}
            {f.came && !f.same ? "——消息是真的，涨跌却没跟着走，这很常见" : ""}
          </li>
        )}
      </ul>
    </div>
  );
}

/** 白话：一句话 + 为什么 + 下个月可以想想；当月发生了什么放在最后一行小字 */
function PlainBlock({ script, last }: { script: Script; last: LastSettle }) {
  const v = plainSettle(settleFacts(script, last));
  return (
    <div className="voice mt-5" data-testid="voice-plain">
      <p className="vp-line">{v.line}</p>
      <p className="text-sm">{v.why}</p>
      <p className="text-sm text-sub">{v.next}</p>
      <p className="mt-1 text-xs text-sub" data-prose>
        当时发生了什么：{script.months[last.month].hindsight}
      </p>
    </div>
  );
}

/** 研报：结论一行 + 收益归因表 + 敞口 / 回撤；当月市场事件 */
function ProBlock({ script, last }: { script: Script; last: LastSettle }) {
  const r = proSettle(settleFacts(script, last));
  return (
    <div className="voice mt-5" data-testid="voice-pro">
      <p className="text-sm font-bold">{r.conclusion}</p>
      <table className="vr-table num">
        <thead>
          <tr>
            <th>资产</th>
            <th className="r">仓位</th>
            <th className="r">涨跌</th>
            <th className="r">贡献</th>
          </tr>
        </thead>
        <tbody className="stagger">
          {r.rows.map((x, i) => (
            <tr key={x.id} style={{ "--i": i } as React.CSSProperties}>
              <td className="font-sans">{x.name}</td>
              <td className="r text-sub">{x.weight}%</td>
              <td className={`r ${upDownColor(x.ret)}`}>{x.id === "margin" && last.liquidated ? "强平" : pct(x.ret)}</td>
              <td className={`r font-bold ${upDownColor(x.contrib)}`}>{x.contribText}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-sub">
        <span>
          风险敞口 <b className="num text-ink">{r.exposure}</b>
        </span>
        <span>
          月内最大回撤 <b className="num text-ink">{r.drawdown}</b>
        </span>
      </p>
      <p className="text-xs text-sub" data-prose>
        <span className="vr-k mr-2">市场事件</span>
        {script.months[last.month].hindsight}
      </p>
      {last.month < script.months.length - 1 && (
        <p className="text-xs text-sub" data-testid="pro-track">
          <span className="vr-k mr-2">下月跟踪</span>
          {dueThisRound(script.id, last.month + 1)
            .map((d) => `${+d.m.slice(5)} 月${d.name}（${d.when}）`)
            .join("、")}
        </p>
      )}
    </div>
  );
}
