"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { m as motion } from "motion/react";
import { createPortal } from "react-dom";
import { useFrameLoop } from "@/lib/frameLoop";
import { compose, type Segment } from "@/music/compose";
import { DuetPlayer } from "@/music/player";
import { DuetVisual } from "@/music/visual";
import type { DailyPoint, RoundRecord, Script } from "@/game/types";
import { shortMonth } from "@/lib/format";
import { Pause, Play, X } from "lucide-react";

declare global {
  interface Window {
    __klineMusic?: { position: number; length: number; playing: boolean; sync: () => { samples: number; maxMs: number; avgMs: number } };
  }
}

export function MusicModal({
  script,
  daily,
  history,
  onClose,
  bigPlay = false,
  onCopyLink,
  highlight,
}: {
  script: Script;
  daily: DailyPoint[];
  history: RoundRecord[];
  onClose: () => void;
  /** Opened from a shared music link: show a big play button (audio never starts by itself). */
  bigPlay?: boolean;
  onCopyLink?: () => void;
  /** 12 秒高光: play only these three stretches (music/compose.highlightSegments); the full piece is one tap away */
  highlight?: Segment[];
}) {
  const [hl, setHl] = useState(!!highlight?.length);
  const segs = hl && highlight?.length ? highlight : null;
  const comp = useMemo(() => compose(daily, history, script.startCash), [daily, history, script.startCash]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const player = useRef<DuetPlayer | null>(null);
  const visual = useRef<DuetVisual | null>(null);
  // Note energy drives a slow radial glow behind the canvas (red on up days, green on down days), capped at 15% brightness.
  const energy = useRef({ e: 0, up: true });
  const glow = useRef<HTMLDivElement>(null);
  useFrameLoop((_t, dt) => {
    const g = energy.current;
    g.e = Math.max(0, g.e - dt / 700);
    if (glow.current) {
      glow.current.style.opacity = String(0.15 * g.e);
      glow.current.style.background = `radial-gradient(60% 55% at 50% 50%, ${g.up ? "#FF4D4F" : "#3FB950"}, transparent 70%)`;
    }
  });
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<1 | 2>(1);
  const [needTap, setNeedTap] = useState(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const v = new DuetVisual(canvasRef.current!, comp, {
      yearLabel: script.id,
      startCash: script.startCash,
      monthLabels: script.months.map((m) => shortMonth(m.label)),
    });
    visual.current = v;
    const p = new DuetPlayer(comp, {
      onStep: (note, i) => {
        v.step(note, i);
        energy.current = { e: Math.min(1, note.velocity), up: note.r >= 0 };
        setPos(i + 1);
      },
      onEnd: () => {
        v.finish();
        v.stopLoop();
        setPlaying(false);
        setEnded(true);
        setPos(comp.notes.length);
      },
    });
    player.current = p;
    p.setSegments(segs);
    if (segs) v.seek(segs[0].start);
    setPos(segs ? segs[0].start : 0);
    setEnded(false);
    setPlaying(false);
    window.__klineMusic = {
      get position() {
        return p.position;
      },
      get length() {
        return p.length;
      },
      get playing() {
        return p.playing;
      },
      sync: () => p.syncStats(),
    };
    const fit = () => {
      const box = boxRef.current!;
      const cs = getComputedStyle(box);
      const innerW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const innerH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const portrait = window.innerWidth < window.innerHeight;
      v.resize(Math.max(200, portrait ? Math.min(innerW, (innerH * 9) / 16) : Math.min(innerW, (innerH * 16) / 9)), portrait ? "9:16" : "16:9");
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(boxRef.current!);
    return () => {
      ro.disconnect();
      p.dispose();
      v.dispose();
      delete window.__klineMusic;
    };
  }, [comp, script, segs]);

  const play = useCallback(async () => {
    const p = player.current!;
    try {
      const ok = await p.play();
      if (!ok) {
        setNeedTap(true);
        return;
      }
      if (ended) {
        visual.current!.seek(segs ? segs[0].start : 0);
        setEnded(false);
      }
      setNeedTap(false);
      visual.current!.start();
      setPlaying(true);
    } catch {
      setNeedTap(true);
    }
  }, [ended, segs]);

  const pause = () => {
    player.current!.pause();
    visual.current!.stopLoop();
    setPlaying(false);
  };

  const stop = () => {
    player.current!.stop();
    const at = segs ? segs[0].start : 0;
    visual.current!.seek(at);
    visual.current!.stopLoop();
    setPlaying(false);
    setEnded(false);
    setPos(at);
  };

  const seek = (i: number) => {
    player.current!.seek(i);
    visual.current!.seek(i);
    setEnded(false);
    setPos(i);
  };

  const toggleRate = () => {
    const r = rate === 1 ? 2 : 1;
    setRate(r);
    player.current!.setRate(r);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        if (playing) pause();
        else void play();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const total = comp.notes.length;
  const secs = (n: number) => ((n * 0.2) / rate).toFixed(0);
  // highlight mode: which stretch is playing, and how much of the three has been heard
  const segAt = segs ? segs.findIndex((g) => pos - 1 >= g.start && pos - 1 < g.end) : -1;
  const hlTotal = segs ? segs.reduce((n, g) => n + g.end - g.start, 0) : 0;
  const hlDone = segs ? (ended ? hlTotal : segs.reduce((n, g) => n + Math.max(0, Math.min(g.end, pos) - g.start), 0)) : 0;
  const ring = segs ? hlDone / Math.max(1, hlTotal) : Math.min(1, pos / Math.max(1, total));

  // Portal: an animated ancestor (fade-in transform) would otherwise trap position: fixed.
  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`听听你的 ${script.id}`}
      className="fixed inset-0 z-50 bg-bg flex flex-col"
      data-progress={pos}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div ref={glow} aria-hidden className="pointer-events-none absolute inset-0" style={{ opacity: 0 }} />
      <div className="flex items-center justify-between gap-2 pl-4 pr-24 py-3 border-b border-line">
        <h2 className="font-bold">
          听听你的 {script.id} <span className="text-sub font-normal text-sm ml-2">{comp.major ? "C 大调五声" : "A 小调五声"}</span>
        </h2>
        <button type="button" onClick={onClose} className="h-9 px-3 rounded-md text-sub hover:text-ink hover:bg-card" aria-label="关闭">
          <span className="inline-flex items-center gap-1">
            关闭 <X size={16} strokeWidth={2} aria-hidden />
          </span>
        </button>
      </div>
      <div ref={boxRef} className="relative flex-1 min-h-0 overflow-hidden grid place-items-center p-2 md:p-6" onClick={() => needTap && void play()}>
        <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.32, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
          <canvas ref={canvasRef} className="rounded-xl border border-line max-w-full" />
        </motion.div>
        {bigPlay && !playing && pos === 0 && !ended && !needTap && (
          <button
            type="button"
            onClick={() => void play()}
            aria-label="点击播放"
            className="absolute inset-0 m-auto w-24 h-24 rounded-full bg-up text-white text-4xl grid place-items-center shadow-lg hover:bg-[#ff6b6d]"
          >
            ▶
          </button>
        )}
        {needTap && (
          <p className="absolute inset-x-0 bottom-6 text-center text-sm text-gold" role="alert">
            音频未能启动：点击屏幕任意位置开始
          </p>
        )}
      </div>
      <div className="px-4 pb-4 pt-2 border-t border-line">
        <input
          type="range"
          aria-label="播放进度"
          min={0}
          max={total - 1}
          value={Math.min(pos, total - 1)}
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full accent-up"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* 72px round play/pause with a progress ring that follows the playhead */}
          <button
            type="button"
            onClick={() => (playing ? pause() : void play())}
            aria-label={playing ? "暂停" : ended ? "再听一遍" : (segs ? hlDone > 0 : pos > 0) ? "继续" : "播放"}
            className="relative grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-up text-white transition-transform hover:bg-[#ff6b6d] active:scale-[0.96]"
          >
            <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="36" cy="36" r="33" fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="3" />
              <circle cx="36" cy="36" r="33" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeDasharray={2 * Math.PI * 33} strokeDashoffset={2 * Math.PI * 33 * (1 - ring)} />
            </svg>
            <span aria-hidden className="grid place-items-center">
              {playing ? <Pause size={26} fill="currentColor" strokeWidth={0} /> : <Play size={26} fill="currentColor" strokeWidth={0} className="translate-x-0.5" />}
            </span>
          </button>
          <CtlBtn onClick={stop}>停止</CtlBtn>
          <CtlBtn onClick={toggleRate} aria-label="切换速度">
            <span className="num">{rate}x</span>
          </CtlBtn>
          {highlight?.length ? (
            <CtlBtn onClick={() => setHl(!hl)} data-testid="music-mode">
              {hl ? `听完整版（${secs(total)} 秒）` : `只听 ${secs(highlight.reduce((n, g) => n + g.end - g.start, 0))} 秒高光`}
            </CtlBtn>
          ) : null}
          {onCopyLink && <CtlBtn onClick={onCopyLink}>复制音乐链接</CtlBtn>}
          <span className="num text-xs text-sub ml-auto">
            {segs ? `高光 ${secs(hlDone)}s / ${secs(hlTotal)}s` : `${secs(pos)}s / ${secs(total)}s · 第 ${Math.min(pos, total)} / ${total} 个交易日`}
          </span>
        </div>
        {segs && (
          <ol className="mt-3 grid gap-1.5 text-xs sm:grid-cols-3" data-testid="music-segments">
            {segs.map((g, k) => (
              <li key={g.start} className={`rounded-md border px-2.5 py-1.5 transition-colors ${k === segAt ? "border-up bg-up/10 text-ink" : "border-line text-sub"}`}>
                <span className="num mr-1 text-up">{k + 1}</span>
                {g.label}
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-center text-xs text-sub">
          <span className="text-up">红线是你</span>，<span className="text-[#8C8C8C]">灰线是大盘</span>。每个交易日一个音，越高代表赚得越多；低音是大盘，镲声是换仓或跑赢跑输切换，三声低鼓是强平。
        </p>
      </div>
    </motion.div>,
    document.body,
  );
}

function CtlBtn({ primary, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={`h-9 min-w-16 px-4 rounded-md text-sm font-medium ${primary ? "bg-up text-white hover:bg-[#ff6b6d]" : "border border-line hover:border-sub"}`}
    />
  );
}
