import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "outline" | "danger";

const styles: Record<Variant, string> = {
  primary: "btn-primary bg-gold text-bg hover:bg-[#ffc933] disabled:bg-line disabled:text-sub",
  outline: "border border-line text-ink hover:border-sub hover:bg-card disabled:text-sub",
  ghost: "text-sub hover:text-ink hover:bg-card",
  danger: "bg-up text-white hover:bg-[#ff6b6d]",
};

/** Shared class list so links can look like buttons without nesting <button> in <a>. */
export const btn = (variant: Variant = "primary", extra = "") =>
  `press inline-flex items-center justify-center gap-2 rounded-lg px-4 h-10 text-sm font-medium disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${styles[variant]} ${extra}`;

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" {...props} className={btn(variant, className)} />;
}
