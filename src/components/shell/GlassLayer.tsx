"use client";

import { useEffect, useRef } from "react";
import { applyPrefs, getPrefs, resolve, usePrefs } from "@/lib/prefs";

/*
 * Liquid glass (after Apple's Liquid Glass): the shared SVG refraction filter, the pointer position that the
 * iridescent rims and specular highlights follow (--mx / --my on <html>), and the data loupe.
 * Refraction inside backdrop-filter is Chromium-only; other browsers get frost + rainbow rim.
 */
export function GlassLayer() {
  const prefs = usePrefs();

  useEffect(() => {
    const el = document.documentElement;
    applyPrefs(resolve(getPrefs()));
    const reduceT = window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
    const chromium = /Chrome\/|Chromium\/|Edg\//.test(navigator.userAgent) && !/Firefox\//.test(navigator.userAgent);
    el.classList.toggle("lg-refract", chromium && prefs.glass === "liquid" && !reduceT);
  }, [prefs]);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const el = document.documentElement;
    const on = (e: PointerEvent) => {
      el.style.setProperty("--mx", `${e.clientX}px`);
      el.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, []);

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
        <defs>
          <filter id="lg-refract" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.007 0.012" numOctaves="2" seed="11" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2.5" result="map" />
            {/* three channels displaced by different amounts: the chromatic (rainbow) fringe */}
            <feDisplacementMap in="SourceGraphic" in2="map" scale="12" xChannelSelector="R" yChannelSelector="G" result="dr" />
            <feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale="16" xChannelSelector="R" yChannelSelector="G" result="dg" />
            <feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale="20" xChannelSelector="R" yChannelSelector="G" result="db" />
            <feColorMatrix in="db" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
            <feBlend in="r" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="b" mode="screen" />
          </filter>
        </defs>
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
