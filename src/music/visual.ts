import type { Composition, Note } from "./compose";

const BG = "#0B0F14";
const RED = "#FF4D4F";
const GREEN = "#3FB950";
const GRAY = "#8C8C8C";
const LINE = "#232B36";
const SUB = "#8B95A3";
const INK = "#E6E8EB";

interface Ripple {
  x: number;
  y: number;
  r0: number;
  born: number;
  color: string;
}

export interface VisualOptions {
  yearLabel: string;
  startCash: number;
  monthLabels: string[];
}

/** Canvas 2D renderer: two growing lines, ripples per note, month grid, piano roll, end card. */
export class DuetVisual {
  private ctx: CanvasRenderingContext2D;
  private ripples: Ripple[] = [];
  private current = -1;
  private flashUntil = 0;
  private raf = 0;
  private done = false;
  private lo: number;
  private hi: number;

  constructor(
    private canvas: HTMLCanvasElement,
    private comp: Composition,
    private opts: VisualOptions,
  ) {
    this.ctx = canvas.getContext("2d")!;
    const vals = comp.notes.flatMap((n) => [n.value, n.marketValue]);
    const lo = Math.min(...vals, opts.startCash);
    const hi = Math.max(...vals, opts.startCash);
    const pad = (hi - lo) * 0.08 || opts.startCash * 0.05;
    this.lo = lo - pad;
    this.hi = hi + pad;
  }

  /** Width 16:9 in CSS pixels, backed by devicePixelRatio. */
  resize(cssWidth: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(cssWidth);
    this.cssW = w;
    const h = Math.round((w * 9) / 16);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw(performance.now());
  }

  private cssW = 960;
  private get w() {
    return this.cssW;
  }
  private get h() {
    return (this.w * 9) / 16;
  }

  private plot() {
    const w = this.w;
    const h = this.h;
    return { left: w * 0.05, right: w * 0.97, top: h * 0.13, bottom: h * 0.74 };
  }

  private xAt(i: number) {
    const p = this.plot();
    return p.left + ((p.right - p.left) * i) / Math.max(1, this.comp.notes.length - 1);
  }

  private yAt(v: number) {
    const p = this.plot();
    return p.bottom - ((p.bottom - p.top) * (v - this.lo)) / (this.hi - this.lo);
  }

  step(note: Note, index: number) {
    this.current = index;
    this.done = false;
    const now = performance.now();
    this.ripples.push({ x: this.xAt(index), y: this.yAt(note.value), r0: 4 + Math.min(1, Math.abs(note.r) / 0.05) * 26, born: now, color: note.r >= 0 ? RED : GREEN });
    if (this.ripples.length > 20) this.ripples.splice(0, this.ripples.length - 20);
    if (note.liquidated) this.flashUntil = now + 450;
  }

  seek(index: number) {
    this.current = index - 1;
    this.ripples = [];
    this.done = false;
    this.draw(performance.now());
  }

  finish() {
    this.current = this.comp.notes.length - 1;
    this.done = true;
  }

  start() {
    const loop = (t: number) => {
      this.draw(t);
      this.raf = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(loop);
  }

  stopLoop() {
    cancelAnimationFrame(this.raf);
    this.draw(performance.now());
  }

  draw(now: number) {
    const { ctx, comp } = this;
    const w = this.w;
    const h = this.h;
    const p = this.plot();
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);

    if (now < this.flashUntil) {
      ctx.fillStyle = `rgba(255,77,79,${(0.28 * (this.flashUntil - now)) / 450})`;
      ctx.fillRect(0, 0, w, h);
    }

    // start-line and month boundaries
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(p.left, this.yAt(this.opts.startCash));
    ctx.lineTo(p.right, this.yAt(this.opts.startCash));
    ctx.stroke();
    ctx.setLineDash([3, 5]);
    ctx.font = `${Math.max(10, w * 0.011)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    const starts: number[] = [];
    comp.notes.forEach((n, i) => {
      if (i === 0 || n.month !== comp.notes[i - 1].month) starts.push(i);
    });
    starts.forEach((i, k) => {
      const n = comp.notes[i];
      const x = this.xAt(i);
      const xEnd = this.xAt(k + 1 < starts.length ? starts[k + 1] : comp.notes.length - 1);
      if (i > 0) {
        ctx.strokeStyle = LINE;
        ctx.beginPath();
        ctx.moveTo(x, p.top - 6);
        ctx.lineTo(x, p.bottom);
        ctx.stroke();
      }
      ctx.fillStyle = SUB;
      ctx.fillText(this.opts.monthLabels[n.month] ?? "", (x + xEnd) / 2, p.bottom + w * 0.018);
      if (n.switched) {
        ctx.fillStyle = "#F5B400";
        ctx.fillText("换仓", x + 14, p.top - 10);
      }
    });
    ctx.setLineDash([]);

    const upto = Math.max(-1, Math.min(this.current, comp.notes.length - 1));
    // market (gray) then player (red)
    this.line(upto, (n) => n.marketValue, GRAY, 2);
    this.line(upto, (n) => n.value, RED, 2.6);

    // ripples
    for (const r of this.ripples) {
      const age = (now - r.born) / 900;
      if (age > 1) continue;
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = 1 - age;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r0 * (0.6 + age * 1.6), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    this.ripples = this.ripples.filter((r) => now - r.born < 900);

    // current point + label
    if (upto >= 0) {
      const n = comp.notes[upto];
      const x = this.xAt(upto);
      const y = this.yAt(n.value);
      ctx.fillStyle = "#fff";
      ctx.shadowColor = RED;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      const label = `${n.date}  ¥ ${Math.round(n.value).toLocaleString("en-US")}`;
      ctx.font = `600 ${Math.max(11, w * 0.013)}px ui-monospace, monospace`;
      ctx.textAlign = x > w * 0.75 ? "right" : x < w * 0.2 ? "left" : "center";
      ctx.fillStyle = INK;
      ctx.fillText(label, x, y - 14);
    }

    this.pianoRoll(upto);

    if (this.done) this.endCard();
  }

  private line(upto: number, pick: (n: Note) => number, color: string, width: number) {
    if (upto < 0) return;
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i <= upto; i++) {
      const x = this.xAt(i);
      const y = this.yAt(pick(this.comp.notes[i]));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  /** 30 most recent notes as a piano roll along the bottom. */
  private pianoRoll(upto: number) {
    const { ctx } = this;
    const w = this.w;
    const h = this.h;
    const top = h * 0.8;
    const height = h * 0.16;
    const left = w * 0.05;
    const width = w * 0.92;
    const cols = 30;
    const cw = width / cols;
    const rh = height / 15;
    ctx.fillStyle = "#10151c";
    ctx.fillRect(left, top, width, height);
    for (let k = 0; k < cols; k++) {
      const i = upto - (cols - 1 - k);
      if (i < 0) continue;
      const n = this.comp.notes[i];
      const y = top + height - (n.idx + 1) * rh;
      ctx.fillStyle = n.r >= 0 ? RED : GREEN;
      ctx.globalAlpha = 0.35 + 0.65 * ((k + 1) / cols);
      ctx.fillRect(left + k * cw + 1, y, cw - 2, rh - 1);
    }
    ctx.globalAlpha = 1;
  }

  private endCard() {
    const { ctx } = this;
    const w = this.w;
    const last = this.comp.notes.at(-1);
    if (!last) return;
    const diff = (last.value - last.marketValue) / this.opts.startCash;
    const pts = Math.abs(diff * 100).toFixed(1);
    const text = `你的 ${this.opts.yearLabel} · ${diff >= 0 ? "跑赢" : "跑输"}大盘 ${pts} 个百分点`;
    ctx.font = `800 ${Math.max(16, w * 0.03)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(11,15,20,0.72)";
    ctx.fillRect(0, this.h * 0.02, w, w * 0.06);
    ctx.fillStyle = diff >= 0 ? RED : GREEN;
    ctx.fillText(text, w / 2, this.h * 0.02 + w * 0.042);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
  }
}
