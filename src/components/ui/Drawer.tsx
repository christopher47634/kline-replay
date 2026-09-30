"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/*
 * Two-level drawer (二级抽屉): phones get a bottom sheet, desktops a right-hand panel.
 * Level 1 is the overview; picking a row slides level 2 over it from the right, with 「返回」 at the top.
 * Esc steps back to level 1 first, then closes. Focus is trapped inside and handed back to the opener
 * (or to a button with the same label, when a skin change re-rendered the page header).
 */

export interface DrawerPage {
  key: string;
  title: string;
  label?: ReactNode;
  body: ReactNode;
}

const Ctx = createContext<{ push: (p: DrawerPage) => void; pop: () => void }>({ push: () => {}, pop: () => {} });
export const useDrawer = () => useContext(Ctx);

const X = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export function Drawer({ open, onClose, title, label, children }: { open: boolean; onClose: () => void; title: string; label?: ReactNode; children: ReactNode }) {
  const [sub, setSub] = useState<DrawerPage | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const subRef = useRef(sub);
  subRef.current = sub;
  const push = useCallback((p: DrawerPage) => setSub(p), []);
  const pop = useCallback(() => setSub(null), []);

  useEffect(() => {
    if (!open) setSub(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (subRef.current) setSub(null);
        else onClose();
      }
      if (e.key === "Tab" && panel.current) {
        const layer = panel.current.querySelector(".drawer-layer.is-top") ?? panel.current;
        const els = [...layer.querySelectorAll<HTMLElement>("button, a[href], input, select, [tabindex='0']")].filter((x) => !x.hasAttribute("disabled"));
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      html.style.overflow = prevOverflow;
      const o = opener.current as HTMLElement | null;
      const name = o?.getAttribute("aria-label");
      const back = o && document.contains(o) ? o : name ? document.querySelector<HTMLElement>(`[aria-label="${CSS.escape(name)}"]`) : null;
      back?.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>(".drawer-layer.is-top button")?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [sub, open]);

  if (!open) return null;
  return createPortal(
    <div className="drawer-root" data-lenis-prevent>
      <div className="drawer-scrim" onClick={onClose} />
      <div className={`drawer${sub ? " has-sub" : ""}`} role="dialog" aria-modal="true" aria-label={sub ? `${title} · ${sub.title}` : title} ref={panel}>
        <div className="drawer-grip" aria-hidden />
        <Ctx.Provider value={{ push, pop }}>
          <section className={`drawer-layer drawer-l1${sub ? "" : " is-top"}`} {...(sub ? { inert: true, "aria-hidden": true } : {})}>
            <header className="drawer-head">
              <div>
                {label && <div className="drawer-label">{label}</div>}
                <h2 className="drawer-title">{title}</h2>
              </div>
              <button type="button" className="drawer-x" onClick={onClose} aria-label="关闭">
                <X />
              </button>
            </header>
            <div className="drawer-body">{children}</div>
          </section>
          {sub && (
            <section className="drawer-layer drawer-l2 is-top" key={sub.key}>
              <header className="drawer-head">
                <div>
                  <button type="button" className="drawer-back" onClick={pop}>
                    ‹ {title}
                  </button>
                  {sub.label && <div className="drawer-label">{sub.label}</div>}
                  <h2 className="drawer-title">{sub.title}</h2>
                </div>
                <button type="button" className="drawer-x" onClick={onClose} aria-label="关闭">
                  <X />
                </button>
              </header>
              <div className="drawer-body">{sub.body}</div>
            </section>
          )}
        </Ctx.Provider>
      </div>
    </div>,
    document.body,
  );
}
