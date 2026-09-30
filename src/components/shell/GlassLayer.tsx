"use client";

import { useEffect, useRef } from "react";
import { applyPrefs, getPrefs, resolve, usePrefs } from "@/lib/prefs";
import { lensFilter } from "./lens";

/*
 * Liquid glass, after Apple's Liquid Glass. What makes it read as glass is not a coloured ring but three layers:
 *  - lensing: the rim bends what is behind it (lens.ts builds one displacement map per control size);
 *  - a white specular highlight on the rim, facing the light — on desktops the light is where the pointer is;
 *  - illumination: pressing lights the glass up from the touch point, and the glow spills into nearby glass.
 * The CSS is in skins.css; this layer keeps the maps, the light direction and the press state, plus the data loupe.
 */
export function GlassLayer() {
  const prefs = usePrefs();
  const defs = useRef<SVGDefsElement>(null);

  useEffect(() => {
    applyPrefs(resolve(getPrefs()));
  }, [prefs]);

  // lens maps: one filter per (width, height, radius), refitted when a control resizes
  useEffect(() => {
    const reduceT = window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
    const chromium = /Chrome\/|Chromium\/|Edg\//.test(navigator.userAgent) && !/Firefox\//.test(navigator.userAgent);
    const on = chromium && !reduceT && (prefs.glass === "clear" || prefs.glass === "tinted");
    document.documentElement.classList.toggle("lg-refract", on);
    const clear = (el: HTMLElement) => el.style.removeProperty("--lg-filter");
    const root = defs.current;
    if (!on || !root) {
      document.querySelectorAll<HTMLElement>(".lg").forEach(clear);
      return;
    }
    const tracked = new Set<HTMLElement>();
    const keyOf = new WeakMap<HTMLElement, string>();
    const fit = (el: HTMLElement) => {
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (w < 8 || h < 8) return;
      const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2);
      const key = `lgf-${w}x${h}r${Math.round(r)}`;
      if (keyOf.get(el) === key) return;
      keyOf.set(el, key);
      if (!root.querySelector(`#${key}`)) root.appendChild(lensFilter(key, w, h, r));
      el.style.setProperty("--lg-filter", `url(#${key})`);
    };
    const ro = new ResizeObserver((es) => es.forEach((e) => fit(e.target as HTMLElement)));
    const scan = () =>
      document.querySelectorAll<HTMLElement>(".lg").forEach((el) => {
        if (tracked.has(el)) return;
        tracked.add(el);
        ro.observe(el);
        fit(el);
      });
    // Lens maps are cosmetic: build them when the main thread is idle, never while the page is hydrating.
    type Idle = (cb: () => void, o?: { timeout: number }) => number;
    const idle: Idle = (window as unknown as { requestIdleCallback?: Idle }).requestIdleCallback ?? ((cb) => window.setTimeout(cb, 1200));
    const cancelIdle = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback ?? clearTimeout;
    let pending = 0;
    const later = () => {
      if (!pending)
        pending = idle(
          () => {
            pending = 0;
            scan();
          },
          { timeout: 2500 },
        );
    };
    later();
    const mo = new MutationObserver(later);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      ro.disconnect();
      cancelIdle(pending);
      tracked.forEach(clear);
      root.replaceChildren();
    };
  }, [prefs.glass]);

  // highlight direction, hover light, press illumination
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const lastA = new WeakMap<HTMLElement, number>();
    let hover: HTMLElement | null = null;
    let lit: HTMLElement[] = [];
    let raf = 0;
    let px = 0;
    let py = 0;
    const local = (el: HTMLElement, x: number, y: number) => {
      const b = el.getBoundingClientRect();
      el.style.setProperty("--px", `${(x - b.left).toFixed(0)}px`);
      el.style.setProperty("--py", `${(y - b.top).toFixed(0)}px`);
      return b;
    };
    const aim = () => {
      raf = 0;
      document.querySelectorAll<HTMLElement>(".lg").forEach((el) => {
        const b = el.getBoundingClientRect();
        if (!b.width) return;
        // the gradient starts on the side the light comes from
        let a = (Math.atan2(px - (b.left + b.width / 2), -(py - (b.top + b.height / 2))) * 180) / Math.PI + 180;
        const prev = lastA.get(el);
        if (prev !== undefined) a += Math.round((prev - a) / 360) * 360; // never swing the long way round
        lastA.set(el, a);
        el.style.setProperty("--lg-a", `${a.toFixed(1)}deg`);
      });
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(aim);
      const t = (e.target as Element | null)?.closest?.<HTMLElement>(".lg") ?? null;
      if (t !== hover) {
        hover?.classList.remove("lg-hover");
        hover = t;
        t?.classList.add("lg-hover");
      }
      if (t) local(t, e.clientX, e.clientY);
    };
    const onDown = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest?.<HTMLElement>(".lg");
      if (!t) return;
      const b = local(t, e.clientX, e.clientY);
      t.classList.add("lg-press");
      lit = [t];
      document.querySelectorAll<HTMLElement>(".lg").forEach((o) => {
        if (o === t) return;
        const c = o.getBoundingClientRect();
        const gap = Math.max(c.left - b.right, b.left - c.right, c.top - b.bottom, b.top - c.bottom, 0);
        if (c.width && gap < 140) {
          local(o, e.clientX, e.clientY);
          o.classList.add("lg-near");
          lit.push(o);
        }
      });
    };
    const onUp = () => {
      lit.forEach((o) => o.classList.remove("lg-press", "lg-near"));
      lit = [];
    };
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
        <defs ref={defs} />
      </svg>
      <Loupe />
    </>
  );
}

/*
 * Data loupe: hover a key number (anything marked data-zoom) and it springs up 10% while a glass lens next to
 * the pointer shows it large with its label (data-zoom-label). Text, not a bitmap, so it is always sharp.
 * Fine pointers only; under reduced motion the number still grows but no lens follows the pointer.
 */
function Loupe() {
  const lens = useRef<HTMLDivElement>(null);
  const val = useRef<HTMLSpanElement>(null);
  const lab = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let hot: HTMLElement | null = null;
    let x = 0;
    let y = 0;
    let lx = 0;
    let ly = 0;
    let raf = 0;
    let shown = false;
    const tick = () => {
      lx += (x - lx) * 0.28;
      ly += (y - ly) * 0.28;
      if (lens.current) lens.current.style.transform = `translate3d(${lx + 22}px, ${ly - 124}px, 0) scale(${shown ? 1 : 0.6})`;
      raf = shown ? requestAnimationFrame(tick) : 0;
    };
    const set = (el: HTMLElement | null) => {
      if (el === hot) return;
      hot?.classList.remove("zoom-hot");
      hot = el;
      if (!el) {
        shown = false;
        lens.current?.classList.remove("is-on");
        return;
      }
      el.classList.add("zoom-hot");
      if (reduce) return;
      const raw = (el.dataset.zoomValue || el.textContent || "").trim();
      if (val.current) {
        val.current.textContent = raw;
        val.current.style.fontSize = raw.length > 8 ? "22px" : "";
        val.current.style.color = el.dataset.zoomTone === "up" ? "var(--color-up)" : el.dataset.zoomTone === "down" ? "var(--color-down)" : "var(--color-ink)";
      }
      if (lab.current) lab.current.textContent = el.dataset.zoomLabel ?? "";
      shown = true;
      lens.current?.classList.add("is-on");
      if (!raf) {
        lx = x;
        ly = y;
        raf = requestAnimationFrame(tick);
      }
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (document.documentElement.dataset.loupe === "off") return set(null);
      const t = (e.target as Element | null)?.closest?.<HTMLElement>("[data-zoom]") ?? null;
      set(t);
    };
    const off = () => set(null);
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", off);
    window.addEventListener("scroll", off, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", off);
      window.removeEventListener("scroll", off);
      cancelAnimationFrame(raf);
      hot?.classList.remove("zoom-hot");
    };
  }, []);

  return (
    <div className="loupe lg" ref={lens} aria-hidden>
      <span className="loupe-val num" ref={val} />
      <span className="loupe-label" ref={lab} />
    </div>
  );
}
