const BG = "#07090D";
const GRAY = "#8C8C8C";
const GOLD = "#F5B400";
const RED = "#FF4D4F";
const GREEN = "#3FB950";
const SUB = "#8B95A3";
const GRID = "#1C2431";

export interface LineData {
  /** 60 closes up to and including the event day. */
  before: number[];
  /** 20 closes after; only the first `revealed` are drawn. */
  after: number[];
  revealed: number;
}

/**
 * Canvas 2D chart for event cards: a gray history line, a gold "today" marker on the event day, a hatched
 * "what next?" area on the right, and the aftermath growing day by day (red if it ends up, green if down).
 */
export class LineCanvas {
  private ctx: CanvasRenderingContext2D;
  private w = 640;
  private h = 320;
  private data: LineData = { before: [], after: [], revealed: 0 };
  private lo = 0;
  private hi = 1;
  private pulseUntil = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }

  resize(cssWidth: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(240, Math.round(cssWidth));
    this.h = Math.round(this.w * (this.w < 480 ? 0.72 : 0.5));
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  set(data: LineData) {
    this.data = data;
    // The y-range covers the whole run (incl. hidden days) so the axis never jumps during the reveal.
    const all = [...data.before, ...data.after];
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const pad = (hi - lo) * 0.08 || hi * 0.02;
    this.lo = lo - pad;
    this.hi = hi + pad;
    this.draw();
  }

  pulse(ms = 260) {
    this.pulseUntil = performance.now() + ms;
  }

  private plot() {
    return { left: this.w * 0.03, right: this.w * 0.97, top: this.h * 0.1, bottom: this.h * 0.92 };
  }

  private x(k: number) {
    // 60 history points (k 0..59), then 20 future points (k 60..79 = after[0..19])
    const p = this.plot();
    return p.left + ((p.right - p.left) * k) / 79;
  }

  private y(v: number) {
    const p = this.plot();
    return p.bottom - ((p.bottom - p.top) * (v - this.lo)) / (this.hi - this.lo);
  }

  draw() {
    const { ctx, w, h } = this;
    const { before, after, revealed } = this.data;
    const p = this.plot();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    if (!before.length) return;

    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    for (let g = 0; g <= 3; g++) {
      const y = p.top + ((p.bottom - p.top) * g) / 3;
      ctx.beginPath();
      ctx.moveTo(p.left, y);
      ctx.lineTo(p.right, y);
      ctx.stroke();
    }

    // hatched future area
    const xToday = this.x(before.length - 1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(xToday, p.top, p.right - xToday, p.bottom - p.top);
    ctx.clip();
    ctx.fillStyle = "#10151c";
    ctx.fillRect(xToday, p.top, p.right - xToday, p.bottom - p.top);
    ctx.strokeStyle = "#1c2430";
    ctx.lineWidth = 3;
    for (let s = -h; s < w; s += 9) {
      ctx.beginPath();
      ctx.moveTo(xToday + s, p.bottom);
      ctx.lineTo(xToday + s + (p.bottom - p.top), p.top);
      ctx.stroke();
    }
    ctx.restore();
    if (revealed === 0) {
      ctx.fillStyle = SUB;
      ctx.font = `600 ${Math.max(12, w * 0.028)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("接下来？", (xToday + p.right) / 2, (p.top + p.bottom) / 2);
    }

    // history line
    ctx.lineJoin = "round";
    ctx.strokeStyle = GRAY;
    ctx.lineWidth = 2;
    ctx.beginPath();
    before.forEach((v, k) => (k === 0 ? ctx.moveTo(this.x(k), this.y(v)) : ctx.lineTo(this.x(k), this.y(v))));
    ctx.stroke();

    // event day marker
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(xToday, p.top);
    ctx.lineTo(xToday, p.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = GOLD;
    ctx.font = `700 ${Math.max(11, w * 0.024)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("今天", xToday, p.top - 4);
    ctx.beginPath();
    ctx.arc(xToday, this.y(before[before.length - 1]), 4, 0, Math.PI * 2);
    ctx.fill();

    // aftermath
    const shown = Math.min(revealed, after.length);
    if (shown > 0) {
      const color = after[after.length - 1] >= before[before.length - 1] ? RED : GREEN;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(xToday, this.y(before[before.length - 1]));
      for (let k = 0; k < shown; k++) ctx.lineTo(this.x(before.length + k), this.y(after[k]));
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.shadowColor = color;
      ctx.shadowBlur = performance.now() < this.pulseUntil ? 18 : 8;
      ctx.beginPath();
      ctx.arc(this.x(before.length + shown - 1), this.y(after[shown - 1]), 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}
