"use client";

import { useEffect } from "react";

// Last resort when the root layout itself failed: plain markup with inline colours (the stylesheet may be missing too).
export default function GlobalError({ error }: { error: Error }) {
  useEffect(() => {
    if (!/ChunkLoadError|Loading chunk|dynamically imported module/i.test(`${error?.name} ${error?.message}`)) return;
    try {
      if (Date.now() - Number(sessionStorage.getItem("kline:chunk-reload") ?? 0) > 60_000) {
        sessionStorage.setItem("kline:chunk-reload", String(Date.now()));
        window.location.reload();
      }
    } catch {
      /* storage blocked: the buttons below still work */
    }
  }, [error]);
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, background: "#0d1420", color: "#e8edf4", font: "16px/1.6 system-ui, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
          <div>
            <h1 style={{ fontSize: 24 }}>页面没加载完整</h1>
            <p style={{ color: "#9aa7b8" }}>刷新一下就好；你的进度保存在这台设备上，不会丢。</p>
            <p style={{ marginTop: 24 }}>
              <button type="button" onClick={() => window.location.reload()} style={{ color: "#0d1420", background: "#d8b46a", padding: "10px 22px", borderRadius: 8, border: 0, cursor: "pointer" }}>
                重新加载
              </button>
              {/* a plain link on purpose: client-side navigation is what just failed */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" style={{ color: "#e8edf4", marginLeft: 16 }}>
                回首页
              </a>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
