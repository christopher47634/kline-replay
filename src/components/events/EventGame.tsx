"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { encodeEvents } from "@/events/encode";
import { BUCKET_LABELS, maxScore, outcome, pickCards, scoreGame } from "@/events/engine";
import { CARDS_PER_GAME, type Guess, type PreparedDeck, type PreparedEvent } from "@/events/types";
import { pct, upDownColor } from "@/lib/format";
import { haptic, play } from "@/lib/sfx";
import { m as motion, useMotionValue, useTransform } from "motion/react";
import { useMotionPref } from "@/components/shell/MotionPref";
import { composePhrase } from "@/music/compose";
import { PhrasePlayer } from "@/music/phrase";
import { EventChart } from "./EventChart";

/** Swipe distance (px) that commits a guess on phones. */
const SWIPE = 80;

type Phase ="intro" | "guess" | "reveal" | "shown";

export function EventGame({ deck, deckNo }: { deck: PreparedDeck; deckNo: number }) {
  const router = useRouter();
  const [advanced, setAdvanced] = useState(false);
  const [picks, setPicks] = useState<PreparedEvent[]>([]);
  const [i, setI] = useState(0);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [phase, setPhase] = useState<Phase>("intro");
  const [dirChoice, setDirChoice] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [pulse, setPulse] = useState(0);
  const player = useRef<PhrasePlayer | null>(null);

  useEffect(() => {
    player.current = new PhrasePlayer();
    return () => player.current?.dispose();
  }, []);

  const { reduce, touch } = useMotionPref();
  const dragX = useMotionValue(0);
  const stampUp = useTransform(dragX, [0, SWIPE], [0, 1]);
  const stampDown = useTransform(dragX, [-SWIPE, 0], [1, 0]);
  const ev = picks[i];
  const rets = useMemo(() => picks.map((p) => outcome(p).ret), [picks]);
  const played = useMemo(() => scoreGame(rets.slice(0, guesses.length), guesses), [rets, guesses]);
  // The header must not give the answer away while the reveal is still playing: it counts finished cards only.
  const finished = phase === "reveal" ? i : guesses.length;
  const streak = played.cards[finished - 1]?.streak ?? 0;

  const start = () => {
    setPicks(pickCards(deck.events));
    setI(0);
    setGuesses([]);
    setDirChoice(null);
    setRevealed(0);
    setPhase("guess");
  };

  const submit = useCallback(
    async (up: boolean, bucket: number | null) => {
      if (phase !== "guess" || !ev) return;
      const g: Guess = { up, bucket };
      setGuesses((prev) => [...prev, g]);
      setDirChoice(null);
      setPhase("reveal");
      setRevealed(0);
      await player.current?.play(composePhrase(ev.after, ev.before[ev.before.length - 1]), (_n, k) => {
        setRevealed(k + 1);
        setPulse((p) => p + 1);
      });
      setRevealed(ev.after.length);
      setPhase("shown");
    },
    [phase, ev],
  );

  const pickDirection = (up: boolean) => {
    if (advanced) setDirChoice(up);
    else void submit(up, null);
  };

  const next = useCallback(() => {
    if (phase !== "shown") return;
    if (i + 1 >= picks.length) {
      const code = encodeEvents(deck.id, { deckNo, events: picks.map((p) => p.index), guesses });
      router.push(`/events/${deck.id}/result?s=${code}`);
      return;
    }
    setI(i + 1);
    setRevealed(0);
    setPhase("guess");
  }, [phase, i, picks, deck.id, deckNo, guesses, router]);

  // Reveal feedback: right = ding + [15,30,15] buzz, wrong = down sound + 40ms buzz.
  useEffect(() => {
    if (phase !== "shown") return;
    const c = played.cards[i];
    if (!c) return;
    play(c.dirOk ? "ding" : "down");
    haptic(c.dirOk ? "correct" : "wrong");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
      if (phase === "shown" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        next();
      } else if (phase === "guess" && e.key === "ArrowUp") {
        e.preventDefault();
        pickDirection(true);
      } else if (phase === "guess" && e.key === "ArrowDown") {
        e.preventDefault();
        pickDirection(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (phase === "intro" || !ev) {
    return (
      <main className="mx-auto max-w-[720px] px-4 py-14">
        <Link href="/events" className="text-sm text-sub hover:text-ink">
          ← 换个题库
        </Link>
        <h1 className="mt-4 text-3xl md:text-4xl font-black">{deck.title}</h1>
        <p className="mt-3 text-sub leading-relaxed">
          随机抽 {CARDS_PER_GAME} 张历史事件卡。每张卡给你事件发生前 60 个交易日的真实走势，猜：事件日之后的 20 个交易日，{deck.indexName}是涨还是跌？
        </p>
        <ul className="mt-5 text-sm text-sub space-y-1">
          <li>方向猜对 +10，连对 3 张起每张再 +2</li>
          <li>打开进阶模式，再猜幅度，猜对再 +5</li>
        </ul>
        <label className="mt-6 flex items-center gap-3 text-sm cursor-pointer select-none">
          <input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} className="w-4 h-4 accent-gold" />
          进阶模式：同时猜涨跌幅度（满分 {maxScore(true)}，普通模式满分 {maxScore(false)}）
        </label>
        <Button className="mt-8 h-12 px-8 text-base" onClick={start}>
          开始
        </Button>
        <p className="mt-10 text-xs text-sub">虚拟游戏 · 历史数据不代表未来 · 不构成任何投资建议</p>
      </main>
    );
  }

  const out = outcome(ev);
  const cardScore = phase === "shown" ? played.cards[i] : null;
  const total = played.cards.slice(0, finished).reduce((a, c) => a + c.points, 0);

  return (
    <main className="mx-auto max-w-[760px] px-4 pb-16">
      <div className="sticky top-0 z-20 -mx-4 px-4 pr-14 h-11 flex items-center justify-between gap-2 bg-bg/90 backdrop-blur border-b border-line text-sm whitespace-nowrap">
        <span>
          第 <b className="num">{i + 1}</b> / {picks.length} 张
        </span>
        <span className="flex items-center gap-3">
          <span data-testid="event-score">
            得分 <b className="num text-gold">{total}</b>
          </span>
          <span className={streak >= 2 ? "text-up font-bold" : "text-sub"} data-testid="event-streak">
            {streak >= 2 ? "🔥" : ""}连对 ×{streak}
          </span>
        </span>
      </div>

      <motion.article
        key={ev.id}
        data-testid="event-card"
        // the card is dealt from the pile at the bottom right; on phones it can be swiped right (涨) / left (跌)
        initial={reduce ? false : { x: 120, y: 80, rotate: 6, opacity: 0 }}
        animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        drag={touch && phase === "guess" ? "x" : false}
        dragSnapToOrigin
        dragElastic={0.6}
        style={{ x: dragX }}
        onDragEnd={(_e, info) => {
          if (info.offset.x > SWIPE) pickDirection(true);
          else if (info.offset.x < -SWIPE) pickDirection(false);
        }}
        className={`paper-surface relative mt-5 rounded-2xl border p-5 md:p-6 ${cardScore ? (cardScore.dirOk ? "border-gold flash-gold" : "border-up shake") : "border-[#b9ad8f]"}`}
      >
        {touch && phase === "guess" && (
          <>
            <motion.span aria-hidden style={{ opacity: stampUp }} className="pointer-events-none absolute right-4 top-4 -rotate-12 rounded-md border-4 border-[#B3261E] px-3 py-1 text-3xl font-black text-[#B3261E]">
              涨
            </motion.span>
            <motion.span aria-hidden style={{ opacity: stampDown }} className="pointer-events-none absolute left-4 top-4 rotate-12 rounded-md border-4 border-[#1F7A35] px-3 py-1 text-3xl font-black text-[#1F7A35]">
              跌
            </motion.span>
          </>
        )}
        <p className="num text-3xl md:text-4xl font-black tracking-tight">{ev.date}</p>
        <h2 className="mt-2 text-xl md:text-2xl font-bold leading-snug">{ev.title}</h2>
        <p className="mt-3 text-[15px] leading-relaxed">{ev.context}</p>
        <p className="mt-3 flex flex-wrap gap-1.5">
          {ev.tags.map((t) => (
            <span key={t} className="rounded-full bg-[#2A2622]/10 px-2 py-0.5 text-xs text-[#5b5142]">
              {t}
            </span>
          ))}
        </p>
      </motion.article>

      <div className="mt-4">
        <EventChart before={ev.before} after={ev.after} revealed={revealed} pulse={pulse} />
      </div>

      {phase === "guess" && (
        <section aria-label="猜测" className="mt-5">
          <p className="text-sm text-sub mb-2">事件日之后的 20 个交易日，{deck.indexName}会？</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              data-testid="guess-up"
              onClick={() => pickDirection(true)}
              className={`group relative h-16 overflow-hidden rounded-xl border-2 border-up bg-up/10 text-xl font-black text-up transition-colors duration-200 hover:text-white active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${dirChoice === true ? "!bg-up !text-white" : ""}`}
            >
              <span aria-hidden className="absolute inset-0 translate-y-full bg-up transition-transform duration-200 group-hover:translate-y-0" />
              <span className="relative">▲ 涨</span>
            </button>
            <button
              type="button"
              data-testid="guess-down"
              onClick={() => pickDirection(false)}
              className={`group relative h-16 overflow-hidden rounded-xl border-2 border-down bg-down/10 text-xl font-black text-down transition-colors duration-200 hover:text-white active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${dirChoice === false ? "!bg-down !text-white" : ""}`}
            >
              <span aria-hidden className="absolute inset-0 translate-y-full bg-down transition-transform duration-200 group-hover:translate-y-0" />
              <span className="relative">▼ 跌</span>
            </button>
          </div>
          {advanced && (
            <div className="mt-3">
              <p className="text-xs text-sub mb-2">{dirChoice === null ? "先选方向，再选幅度（选完自动揭晓）" : `你选了${dirChoice ? "涨" : "跌"}，再选幅度：`}</p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="幅度档位">
                {BUCKET_LABELS.map((label, b) => (
                  <button
                    key={label}
                    type="button"
                    data-testid={`bucket-${b}`}
                    disabled={dirChoice === null}
                    onClick={() => void submit(dirChoice!, b)}
                    className="num h-10 px-4 rounded-full border border-line text-sm hover:border-gold disabled:opacity-40 disabled:hover:border-line"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="mt-3 hidden md:block text-xs text-sub">
            键盘：<kbd className="num">↑</kbd> 涨 · <kbd className="num">↓</kbd> 跌
          </p>
        </section>
      )}

      {phase === "reveal" && (
        <p className="mt-5 text-center text-sm text-sub" aria-live="polite">
          揭晓中…第 <span className="num">{revealed}</span> / {ev.after.length} 个交易日
        </p>
      )}

      {phase === "shown" && cardScore && (
        <section aria-label="揭晓" className="mt-5 fade-in" data-testid="event-reveal">
          <div className="flex items-center gap-4">
            <span className={`pop num text-5xl font-black ${cardScore.points > 0 ? "text-gold" : "text-sub"}`} data-testid="event-points">
              +{cardScore.points}
            </span>
            <div className="text-sm">
              <p>
                20 个交易日后：<b className={`num ${upDownColor(out.ret)}`}>{pct(out.ret)}</b>
                <span className="ml-2">{cardScore.dirOk ? "方向猜对了" : "方向猜错了"}</span>
              </p>
              <p className="text-sub mt-0.5">
                你猜{guesses[i].up ? "涨" : "跌"}
                {guesses[i].bucket !== null && <>，幅度「{BUCKET_LABELS[guesses[i].bucket!]}」{cardScore.bucketOk ? "✓" : `（实际「${BUCKET_LABELS[out.bucket]}」）`}</>}
                {cardScore.bonus > 0 && <span className="text-up ml-2">连对加成 +{cardScore.bonus}</span>}
              </p>
            </div>
          </div>
          <p className="mt-4 rounded-xl bg-card border border-line p-4 text-[15px] leading-relaxed">
            <span className="text-xs text-gold mr-2">当时发生了什么</span>
            {ev.hindsight}
          </p>
          <Button className="mt-4 w-full h-12 text-base" data-testid="next-card" onClick={next}>
            {i + 1 >= picks.length ? "查看结算 →" : "下一张 →"}
          </Button>
          <p className="mt-2 hidden md:block text-center text-xs text-sub">
            <kbd className="num">Enter</kbd> / <kbd className="num">空格</kbd> 继续
          </p>
        </section>
      )}
    </main>
  );
}
