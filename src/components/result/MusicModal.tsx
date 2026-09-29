"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { compose } from "@/music/compose";
import { DuetPlayer } from "@/music/player";
import { DuetVisual } from "@/music/visual";
import type { DailyPoint, RoundRecord, Script } from "@/game/types";
import { shortMonth } from "@/lib/format";

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
}: {
  script: Script;
  daily: DailyPoint[];
  history: RoundRecord[];
  onClose: () => void;
  /** Opened from a shared music link: show a big play button (audio never starts by itself). */
  bigPlay?: boolean;
  onCopyLink?: () => void;
}) {
  const comp = useMemo(() => compose(daily, history, script.startCash), [daily, history, script.startCash]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const player = useRef<DuetPlayer | null>(null);
  const visual = useRef<DuetVisual | null>(null);
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
  }, [comp, script]);

  const play = useCallback(async () => {
    const p = player.current!;
    try {
      const ok = await p.play();
      if (!ok) {
        setNeedTap(true);
        return;
      }
      if (ended) {
        visual.current!.seek(0);
        setEnded(false);
      }
      setNeedTap(false);
      visual.current!.start();
      setPlaying(true);
    } catch {
      setNeedTap(true);
    }
  }, [ended]);

  const pause = () => {
    player.current!.pause();
    visual.current!.stopLoop();
    setPlaying(false);
  };

  const stop = () => {
    player.current!.stop();
    visual.current!.seek(0);
    visual.current!.stopLoop();
    setPlaying(false);
    setEnded(false);
    setPos(0);
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

  // Portal: an animated ancestor (fade-in transform) would otherwise trap position: fixed.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`听听你的 ${script.id}`} className="fixed inset-0 z-50 bg-bg flex flex-col" data-progress={pos}>
      <div className="flex items-center justify-between pl-4 pr-14 py-3 border-b border-line">
        <h2 className="font-bold">
          听听你的 {script.id} <span className="text-sub font-normal text-sm ml-2">{comp.major ? "C 大调五声" : "A 小调五声"}</span>
        </h2>
        <button type="button" onClick={onClose} className="h-9 px-3 rounded-md text-sub hover:text-ink hover:bg-card" aria-label="关闭">
          关闭 ✕
        </button>
      </div>
      <div ref={boxRef} className="relative flex-1 min-h-0 overflow-hidden grid place-items-center p-2 md:p-6" onClick={() => needTap && void play()}>
        <canvas ref={canvasRef} className="rounded-xl border border-line max-w-full" />
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
          {playing ? (
            <CtlBtn onClick={pause}>暂停</CtlBtn>
          ) : (
            <CtlBtn onClick={() => void play()} primary>
              {ended ? "再听一遍" : pos > 0 ? "继续" : "播放"}
            </CtlBtn>
          )}
          <CtlBtn onClick={stop}>停止</CtlBtn>
          <CtlBtn onClick={toggleRate} aria-label="切换速度">
            <span className="num">{rate}x</span>
          </CtlBtn>
          {onCopyLink && <CtlBtn onClick={onCopyLink}>复制音乐链接</CtlBtn>}
          <span className="num text-xs text-sub ml-auto">
            {secs(pos)}s / {secs(total)}s · 第 {Math.min(pos, total)} / {total} 个交易日
          </span>
        </div>
        <p className="mt-3 text-center text-xs text-sub">
          <span className="text-up">红线是你</span>，<span className="text-[#8C8C8C]">灰线是大盘</span>。每个交易日一个音，越高代表赚得越多；低音是大盘，镲声是换仓或跑赢跑输切换，三声低鼓是强平。
        </p>
      </div>
    </div>,
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
