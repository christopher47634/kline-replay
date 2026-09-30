/*
 * Confetti for the moments worth it (after Magic UI's Confetti, which wraps canvas-confetti, ISC):
 *  - "month": a strong month (+6% or more) — one short burst from the big number, in the up colour and gold.
 *  - "year":  beating the market over the year — two side cannons, once.
 * canvas-confetti is imported only when it fires. Off under reduced motion (system or 阅读设置).
 */
export async function celebrate(kind: "month" | "year", from?: Element | null) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  if (root.dataset.reduceMotion === "1" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const css = getComputedStyle(root);
  const colors = [css.getPropertyValue("--color-up").trim(), css.getPropertyValue("--color-gold").trim(), "#ffffff"].filter(Boolean);
  const { default: confetti } = await import("canvas-confetti");
  // A modal <dialog> sits in the browser's top layer: draw into a canvas inside it, or the confetti falls behind it.
  const host = from?.closest("dialog") ?? document.body;
  let canvas = host.querySelector<HTMLCanvasElement>(":scope > canvas.confetti");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "confetti";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100vw", height: "100vh", pointerEvents: "none", zIndex: "120" });
    host.appendChild(canvas);
  }
  const fire = confetti.create(canvas, { resize: true, useWorker: true, disableForReducedMotion: true });
  const k = root.dataset.perf === "2" ? 0.4 : 1; // lib/perf.ts: a device that is struggling gets a lighter burst
  if (kind === "month") {
    const b = from?.getBoundingClientRect();
    const origin = b ? { x: (b.left + b.width / 2) / innerWidth, y: (b.top + b.height / 2) / innerHeight } : { x: 0.5, y: 0.4 };
    await fire({ particleCount: Math.round(70 * k), spread: 70, startVelocity: 32, ticks: 160, gravity: 1.1, scalar: 0.85, origin, colors });
  } else {
    const end = Date.now() + 900;
    const side = () => {
      void fire({ particleCount: Math.max(1, Math.round(4 * k)), angle: 60, spread: 55, startVelocity: 55, origin: { x: 0, y: 0.7 }, colors });
      void fire({ particleCount: Math.max(1, Math.round(4 * k)), angle: 120, spread: 55, startVelocity: 55, origin: { x: 1, y: 0.7 }, colors });
      if (Date.now() < end) requestAnimationFrame(side);
    };
    side();
  }
}
