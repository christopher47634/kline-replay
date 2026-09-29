"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { btn, Button } from "@/components/ui/Button";
import { decodeEvents } from "@/events/encode";
import { BUCKET_LABELS, outcome, scoreGame, titleOf } from "@/events/engine";
import type { Guess, PreparedDeck, PreparedEvent } from "@/events/types";
import { pct, upDownColor } from "@/lib/format";
import { copyText, exportPng } from "@/lib/share";

export function EventResult({ deck, deckNo, code }: { deck: PreparedDeck; deckNo: number; code: string }) {
  const decoded = useMemo(() => decodeEvents(deck.id, code), [deck.id, code]);
  const cards = useMemo(() => {
    if (!decoded.ok || decoded.deckNo !== deckNo) return null;
    const list = decoded.events.map((i) => deck.all[i]);
    return list.every((e) => e && e.verify) ? list : null;
  }, [decoded, deck, deckNo]);

  if (!decoded.ok || !cards) return <Invalid reason={decoded.ok ? "题目不存在" : decoded.error} />;
  return <Body deck={deck} cards={cards} guesses={decoded.guesses} code={code} />;
}

function Invalid({ reason }: { reason: string }) {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">链接无效</h1>
      <p className="mt-3 text-sub">{reason}。这个战绩链接可能被截断或改动过。</p>
      <Link href="/events" className={btn("primary", "mt-8")}>
        去玩一局
      </Link>
    </main>
  );
}

function Body({ deck, cards: evs, guesses, code }: { deck: PreparedDeck; cards: PreparedEvent[]; guesses: Guess[]; code: string }) {
  const outs = evs.map((e) => outcome(e));
  const score = scoreGame(outs.map((o) => o.ret), guesses);
  const title = titleOf(score.total, score.max);
  const hits = score.cards.filter((c) => c.dirOk).length;
  // Poster highlight: the hardest card you got right, else the wrongest one.
  const hardRight = evs.map((e, i) => ({ e, i })).filter(({ e, i }) => score.cards[i].dirOk && e.difficulty === 3)[0];
  const worst = evs.map((e, i) => ({ e, i })).filter(({ i }) => !score.cards[i].dirOk).sort((a, b) => Math.abs(outs[b.i].ret) - Math.abs(outs[a.i].ret))[0];
  const spotlight = hardRight ?? worst ?? { e: evs[0], i: 0 };

  const [origin, setOrigin] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const poster = useRef<HTMLDivElement>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 1800);
  };
  const link = `${origin}/events/${deck.id}/result?s=${code}`;
  const text = [
    `穿越 K 线 · 大事件猜涨跌（${deck.title}）`,
    score.cards.map((c) => (c.dirOk ? "🟩" : "🟥")).join(""),
    `${score.total} / ${score.max} 分 ｜ ${title.label} ｜ 猜对 ${hits} / ${evs.length}`,
    `来挑战 → ${origin}/events/${deck.id}`,
  ].join("\n");

  const savePoster = async () => {
    if (!poster.current) return;
    try {
      await exportPng(poster.current, `穿越K线-大事件-${title.label}.png`, 1080, 1350);
      flash("战绩卡已保存");
    } catch {
      flash("保存失败，可以直接截图");
    }
  };

  return (
    <main className="mx-auto max-w-[860px] px-4 py-10 md:py-14 fade-in">
      <p className="text-sm text-sub">大事件猜涨跌 · {deck.title}</p>
      <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-3">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">
          <span data-testid="event-total" className="num text-gold">
            {score.total}
          </span>
          <span className="text-sub text-xl md:text-2xl font-bold"> / {score.max} 分</span>
        </h1>
        <span data-testid="event-title" className="mb-1 rounded-full border-2 px-4 py-1 text-base font-bold" style={{ borderColor: title.color, color: title.color }}>
          {title.label}
        </span>
      </div>
      <p className="mt-2 text-sub">
        {title.desc}。方向猜对 {hits} / {evs.length} 张。
      </p>

      <ol className="mt-6 divide-y divide-line rounded-2xl bg-card border border-line" aria-label="每张卡的结果">
        {evs.map((e, i) => {
          const c = score.cards[i];
          const g = guesses[i];
          return (
            <li key={e.id} className="p-4 flex items-start gap-3" data-testid="event-row">
              <span className={`mt-0.5 grid place-items-center w-6 h-6 rounded-full text-sm font-bold shrink-0 ${c.dirOk ? "bg-down/20 text-down" : "bg-up/20 text-up"}`}>{c.dirOk ? "✓" : "✕"}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="num text-sub mr-2">{e.date}</span>
                  <span className="font-medium">{e.title}</span>
                </p>
                <p className="mt-1 text-xs text-sub">
                  真实 <b className={`num ${upDownColor(outs[i].ret)}`}>{pct(outs[i].ret)}</b> · 你猜{g.up ? "涨" : "跌"}
                  {g.bucket !== null && `（${BUCKET_LABELS[g.bucket]}）`}
                </p>
              </div>
              <span className={`num font-bold ${c.points > 0 ? "text-gold" : "text-sub"}`}>+{c.points}</span>
            </li>
          );
        })}
      </ol>

      <section aria-label="分享" className="mt-6 flex flex-wrap gap-2">
        <Button onClick={async () => flash((await copyText(text)) ? "结果文本已复制" : "复制失败")}>复制结果文本</Button>
        <Button variant="outline" onClick={async () => flash((await copyText(link)) ? "链接已复制" : "复制失败")}>
          复制链接
        </Button>
        <Button variant="outline" onClick={savePoster}>
          保存战绩卡
        </Button>
        <Link href={`/events/${deck.id}`} className={btn("outline")}>
          再来一局
        </Link>
        <Link href="/play/2015" className={btn("ghost")}>
          去玩穿越模式
        </Link>
      </section>

      <div aria-hidden style={{ position: "fixed", left: -99999, top: 0 }}>
        <div ref={poster}>
          <EventPoster
            deckTitle={deck.title}
            titleLabel={title.label}
            color={title.color}
            total={score.total}
            max={score.max}
            marks={score.cards.map((c) => c.dirOk)}
            spotlight={{ date: spotlight.e.date, title: spotlight.e.title, ret: outs[spotlight.i].ret, ok: score.cards[spotlight.i].dirOk }}
          />
        </div>
      </div>

      {toast && (
        <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-8 z-50 rounded-full bg-ink text-bg px-5 py-2 text-sm font-medium fade-in">
          {toast}
        </div>
      )}
    </main>
  );
}

/** Fixed 1080x1350 share card. */
function EventPoster({
  deckTitle,
  titleLabel,
  color,
  total,
  max,
  marks,
  spotlight,
}: {
  deckTitle: string;
  titleLabel: string;
  color: string;
  total: number;
  max: number;
  marks: boolean[];
  spotlight: { date: string; title: string; ret: number; ok: boolean };
}) {
  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        background: `radial-gradient(120% 70% at 0% 0%, ${color}33 0%, transparent 60%), #07090D`,
        color: "#E6E8EB",
        padding: 88,
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ fontSize: 30, color: "#8B95A3", letterSpacing: 2 }}>穿越 K 线 · 大事件猜涨跌 · {deckTitle}</div>
      <div style={{ marginTop: 90, fontSize: 120, fontWeight: 900, color, lineHeight: 1.05 }}>{titleLabel}</div>
      <div style={{ marginTop: 24, fontSize: 150, fontWeight: 900, fontFamily: "var(--font-mono)", lineHeight: 1 }}>
        {total}
        <span style={{ fontSize: 48, color: "#8B95A3" }}> / {max} 分</span>
      </div>
      <div style={{ marginTop: 64, display: "flex", gap: 14 }}>
        {marks.map((ok, i) => (
          <div key={i} style={{ width: 70, height: 70, borderRadius: 14, background: ok ? "#3FB950" : "#FF4D4F", color: "#fff", fontSize: 44, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {ok ? "✓" : "✕"}
          </div>
        ))}
      </div>
      <div style={{ marginTop: "auto", background: "#0D1117", borderRadius: 24, padding: "28px 32px" }}>
        <div style={{ fontSize: 26, color: "#8B95A3" }}>{spotlight.ok ? "最惊险的一张（猜对了）" : "最打脸的一张"}</div>
        <div style={{ marginTop: 10, fontSize: 40, fontWeight: 800, lineHeight: 1.3 }}>
          {spotlight.date} {spotlight.title}
        </div>
        <div style={{ marginTop: 8, fontSize: 32, color: "#8B95A3" }}>
          之后 20 个交易日 <span style={{ color: spotlight.ret >= 0 ? "#FF4D4F" : "#3FB950", fontWeight: 800 }}>{pct(spotlight.ret)}</span>
        </div>
      </div>
      <div style={{ marginTop: 28, fontSize: 22, color: "#8B95A3" }}>虚拟游戏 · 历史数据不代表未来 · 不构成任何投资建议</div>
    </div>
  );
}
