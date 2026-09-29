"use client";

import { useEffect, useState } from "react";
import { useMotionPref } from "@/components/shell/MotionPref";

/**
 * Digit-wheel number ("翻牌"): every digit is a 0–9 column that rolls to its target. Non-digits (sign, comma,
 * %, ¥) are static. Rolls from `from` (default all zeros) on mount and whenever `value` changes. Reduced motion: the final text.
 * The visible columns are aria-hidden; the element carries the full text as its label.
 */
export function Odometer({
  value,
  format = (n) => String(n),
  duration = 900,
  from,
  stagger = 45,
  className,
  onDone,
  testId,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  from?: number;
  stagger?: number;
  className?: string;
  onDone?: () => void;
  /** Exposed as data-testid; the root also carries data-value (final text) and data-settled (roll finished). */
  testId?: string;
}) {
  const { reduce, ready } = useMotionPref();
  const target = format(value);
  const [shown, setShown] = useState<string>(() => (from !== undefined ? format(from) : target.replace(/\d/g, "0")));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setSettled(false);
    if (reduce) {
      setShown(target);
      setSettled(true);
      onDone?.();
      return;
    }
    // Next frame, so the browser paints the starting digits and the transition actually runs.
    const r = requestAnimationFrame(() => setShown(target));
    const t = setTimeout(() => {
      setSettled(true);
      onDone?.();
    }, duration + stagger * target.length);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ready, reduce, duration]);

  const chars = target.split("");
  // Wheels only ever carry digits: align the start and end values by their digits alone (right-aligned), so a sign,
  // decimal point or % in either string can never end up on a wheel; symbols stay static.
  const tDigits = target.replace(/\D/g, "");
  const sDigits = shown.replace(/\D/g, "").padStart(tDigits.length, "0").slice(-tDigits.length || undefined);
  let digitIdx = -1;
  return (
    <span
      role="text"
      aria-label={target}
      className={`inline-flex items-center align-middle ${className ?? ""}`}
      style={{ lineHeight: 1.15 }}
      data-odometer={target}
      data-testid={testId}
      data-value={target}
      data-settled={settled ? "true" : "false"}
    >
      {chars.map((c, i) => {
        if (!/\d/.test(c)) {
          return (
            <span key={i} aria-hidden className="inline-flex items-center" style={{ height: "1.15em" }}>
              {c}
            </span>
          );
        }
        digitIdx += 1;
        const d = Number(sDigits[digitIdx] ?? 0);
        const fromRight = chars.length - 1 - i;
        return (
          <span key={i} aria-hidden className="relative inline-block overflow-hidden" style={{ height: "1.15em", width: "0.6em" }}>
            <span
              className="absolute inset-x-0 top-0 flex flex-col"
              style={{
                transform: `translateY(${-d * 1.15}em)`,
                transition: reduce ? "none" : `transform ${duration}ms var(--ease-out) ${fromRight * stagger}ms`,
                lineHeight: 1.15,
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <span key={n} className="block text-center" style={{ height: "1.15em" }}>
                  {n}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
