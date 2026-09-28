import { ImageResponse } from "next/og";
import { decodeGame } from "@/game/encode";
import { everLiquidated, playAll, rank, totalReturn } from "@/game/engine";
import { judgePersona, PERSONAS } from "@/game/persona";
import { pct, upDownHex } from "@/lib/format";
import { getScript } from "@/lib/scripts";

export const runtime = "nodejs";

/** Subset a Google font to exactly the glyphs on the card, so CJK renders without shipping a font file. */
async function loadFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@900&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(cssUrl, { signal: AbortSignal.timeout(3000) })).text();
    const url = css.match(/src: url\((.+?)\) format/)?.[1];
    if (!url) return null;
    return await (await fetch(url, { signal: AbortSignal.timeout(3000) })).arrayBuffer();
  } catch {
    return null;
  }
}

const ASCII_ONLY = /[^\x20-\x7e−]/g;

export async function GET(request: Request) {
  const s = new URL(request.url).searchParams.get("s");
  const d = decodeGame(s);
  const script = d.ok ? getScript(d.scriptId) : null;

  let head = "穿越 K 线";
  let big = "";
  let color = "#E6E8EB";
  let badge = "";
  let badgeColor = "#F5B400";
  let persona = "";
  let squares: string[] = [];
  if (d.ok && script) {
    const h = playAll(script, d.allocs);
    const ret = totalReturn(script, h);
    const rk = rank(ret, everLiquidated(h));
    head = `穿越 K 线 · ${script.title}`;
    big = pct(ret);
    color = upDownHex(ret);
    badge = rk.label;
    badgeColor = rk.color;
    persona = `${PERSONAS[judgePersona(h, script)].title} · 你呢？`;
    squares = h.map((r) => (r.liquidated ? "#A855F7" : r.pnl >= 0 ? "#FF4D4F" : "#3FB950"));
  }

  const font = await loadFont(`${head}${badge}${persona}穿越K线0123456789+−.%·`);
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
          background: "#0B0F14",
          color: "#E6E8EB",
          padding: 64,
          fontFamily: font ? "NotoSC" : "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, color: "#8B95A3" }}>{t(head) || "KLINE REPLAY"}</div>
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
