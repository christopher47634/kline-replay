"use client";

import { useEffect, useRef } from "react";
import { LineCanvas } from "@/music/lineCanvas";

/** Chart for one event card: 60 days of history, today marker, and the aftermath growing to `revealed` days. */
export function EventChart({ before, after, revealed, pulse }: { before: number[]; after: number[]; revealed: number; pulse: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<LineCanvas | null>(null);

  useEffect(() => {
    const c = new LineCanvas(canvas.current!);
    chart.current = c;
    const fit = () => {
      if (box.current) c.resize(box.current.clientWidth);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box.current!);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    chart.current?.set({ before, after, revealed });
  }, [before, after, revealed]);

  useEffect(() => {
    if (pulse > 0) {
      chart.current?.pulse();
      chart.current?.draw();
    }
  }, [pulse]);

  return (
    <div ref={box} className="w-full">
      <canvas ref={canvas} role="img" aria-label="事件日前 60 个交易日走势图" className="rounded-xl border border-line block max-w-full" data-revealed={revealed} />
    </div>
  );
}
