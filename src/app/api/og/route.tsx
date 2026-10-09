import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { decodeGame } from "@/game/encode";
import { isBusted, playAll, rank, totalReturn } from "@/game/engine";
import { judgePersona, PERSONAS } from "@/game/persona";
import { pct, upDownHex } from "@/lib/format";
import { getScript } from "@/lib/scripts";

export const runtime = "nodejs";

/** Bundled Noto Sans SC Black subset (scripts/build_og_font.py): no network needed at request time. */
let fontCache: Promise<ArrayBuffer | null> | null = null;
async function readFont(): Promise<Buffer> {
  const rel = "src/app/api/og/NotoSansSC-Black-subset.ttf";
  // cwd is the project root under `next start` / Vercel; the second path is relative to the compiled route.
  for (const path of [join(process.cwd(), rel), join(__dirname, "../../../../..", rel)]) {
    try {
      return await readFile(path);
    } catch {
      /* try the next location */
    }
  }
  throw new Error("OG font subset not found");
}
function loadFont(): Promise<ArrayBuffer | null> {
  fontCache ??= readFont()
    .then((b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer)
    .catch((e) => {
      console.error("[og] font load failed", e);
      return null;
    });
  return fontCache;
}

const ASCII_ONLY = /[^\x20-\x7e−]/g;

export async function GET(request: Request) {
  const s = new URL(request.url).searchParams.get("s");
  const d = decodeGame(s);
  const script = d.ok ? getScript(d.scriptId) : null;

  let head = "穿越 K 线";
  let big = "";
  let color = "#213448";
  let badge = "";
  let badgeColor = "#876329";
  let persona = "";
  let squares: string[] = [];
  if (d.ok && script) {
    const h = playAll(script, d.allocs);
    const ret = totalReturn(script, h);
    const rk = rank(ret, isBusted(h));
    head = `穿越 K 线 · ${script.title}`;
    big = pct(ret);
    color = upDownHex(ret);
    badge = rk.label;
    badgeColor = rk.color;
    persona = `${PERSONAS[judgePersona(h, script)].title} · 你呢？`;
    squares = h.map((r) => (r.liquidated ? "#A855F7" : r.pnl >= 0 ? "#bc3e49" : "#277454"));
  }

  const font = await loadFont();
  const fonts = font ? [{ name: "NotoSC", data: font, weight: 900 as const, style: "normal" as const }] : [];
  // Without the CJK font, drop Chinese text rather than render tofu.
  const t = (x: string) => (font ? x : x.replace(ASCII_ONLY, "").trim());

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "#eaf0f5",
          color: "#213448",
          padding: 64,
          fontFamily: font ? "NotoSC" : "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, color: "#52677b" }}>{t(head) || "KLINE REPLAY"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 36, marginTop: 40 }}>
          <div style={{ fontSize: 168, fontWeight: 900, color, lineHeight: 1 }}>{big || "2015"}</div>
          {badge && font ? (
            <div style={{ display: "flex", fontSize: 44, padding: "10px 28px", borderRadius: 999, border: `4px solid ${badgeColor}`, color: badgeColor }}>
              {badge}
            </div>
          ) : null}
        </div>
        <div style={{ fontSize: 40, marginTop: 28 }}>{t(persona)}</div>
        <div style={{ display: "flex", gap: 14, marginTop: "auto" }}>
          {squares.map((c, i) => (
            <div key={i} style={{ width: 70, height: 70, borderRadius: 12, background: c }} />
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts, headers: { "cache-control": "public, max-age=86400, immutable" } },
  );
}
