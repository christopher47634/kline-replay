"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House } from "lucide-react";

/** 回到首页 (fixed top-right, left of 阅读设置). Hidden on the home page itself. */
export function HomeButton() {
  const path = usePathname();
  if (path === "/") return null;
  return (
    <Link
      href="/"
      aria-label="回到首页"
      title="回到首页"
      data-testid="home-button"
      className="lg fixed top-2 right-[5.5rem] z-[60] grid h-9 w-9 place-items-center rounded-full border border-line bg-bg/80 text-sub backdrop-blur hover:text-ink"
    >
      <House size={17} strokeWidth={1.9} aria-hidden />
    </Link>
  );
}
