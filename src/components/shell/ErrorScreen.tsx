"use client";

import { useEffect } from "react";
import { isChunkError, reloadForChunk } from "@/lib/retry";

/** Shown instead of the bare "Application error" page. A failed chunk reloads by itself (once a minute at most). */
export function ErrorScreen({ error, reset }: { error: Error; reset?: () => void }) {
  const chunk = isChunkError(error);
  useEffect(() => {
    if (chunk) reloadForChunk();
  }, [chunk]);
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-[560px] flex-col items-center justify-center px-6 text-center" data-testid="error-screen">
      <h1 className="text-2xl font-bold">{chunk ? "网络有点慢，页面没加载完整" : "页面出了点问题"}</h1>
      <p className="mt-3 text-sub">刷新一下就好；你的进度保存在这台设备上，不会丢。</p>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => (reset && !chunk ? reset() : window.location.reload())}
          className="btn-primary h-11 rounded-lg bg-gold px-6 font-medium text-bg"
        >
          重新加载
        </button>
        {/* a full page load on purpose: client-side navigation may be what just failed */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="grid h-11 place-items-center rounded-lg border border-line px-6 text-ink">
          回首页
        </a>
      </div>
    </main>
  );
}
