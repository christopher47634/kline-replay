import type { KeyMove } from "@/game/persona";
import type { Persona, Rank } from "@/game/types";
import { pct, upDownHex } from "@/lib/format";

/** On-page persona card. */
export function PersonaCard({ persona, quote, moves }: { persona: Persona; quote: string; moves: KeyMove[] }) {
  return (
    <section aria-label="投资人格" data-testid="persona-card" className="rounded-2xl bg-card border border-line p-5 md:p-7">
      <p className="text-sm text-sub">你的投资人格</p>
      <div className="mt-3 flex items-center gap-4">
        <span className="text-5xl md:text-6xl" aria-hidden>
          {persona.emoji}
        </span>
        <div>
          <h2 className="text-2xl md:text-3xl font-black" style={{ color: persona.color }}>
            {persona.title}
          </h2>
          <p className="text-sm text-sub mt-1">{persona.desc}</p>
        </div>
      </div>
      <blockquote className="mt-5 text-lg leading-relaxed">“{quote}”</blockquote>
      <ul className="mt-5 grid gap-2 sm:grid-cols-3">
        {moves.map((m) => (
          <li key={m.label} className="rounded-lg bg-bg p-3">
            <p className="text-xs text-sub">{m.label}</p>
            <p className="mt-1 text-sm">{m.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Fixed 1080x1350 poster rendered off-screen for PNG export. */
export function PersonaPoster({
  persona,
  quote,
  moves,
  ret,
  rank,
  title,
  blocks,
  diffVsMarket,
}: {
  persona: Persona;
  quote: string;
  moves: KeyMove[];
  ret: number;
  rank: Rank;
  title: string;
  blocks: string[];
  diffVsMarket: number;
}) {
  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        background: `radial-gradient(120% 70% at 0% 0%, ${persona.color}33 0%, transparent 60%), radial-gradient(90% 60% at 100% 100%, #FF4D4F22 0%, transparent 60%), #07090D`,
        color: "#E6E8EB",
        padding: 88,
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ fontSize: 30, color: "#8B95A3", letterSpacing: 2 }}>穿越 K 线 · {title}</div>
      <div style={{ marginTop: 48, fontSize: 112, lineHeight: 1 }}>{persona.emoji}</div>
      <div style={{ marginTop: 28, fontSize: 96, fontWeight: 900, color: persona.color, lineHeight: 1.05 }}>{persona.title}</div>
      <div style={{ marginTop: 12, fontSize: 34, color: "#8B95A3" }}>{persona.desc}</div>
      <div style={{ marginTop: 44, fontSize: 40, lineHeight: 1.5, fontWeight: 500 }}>“{quote}”</div>
      <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 30, color: "#8B95A3" }}>全年收益</div>
          <div style={{ fontSize: 108, fontWeight: 900, fontFamily: "var(--font-mono)", color: upDownHex(ret), lineHeight: 1.05 }}>{pct(ret)}</div>
          <div style={{ fontSize: 30, color: "#8B95A3", marginTop: 8 }}>
            {diffVsMarket >= 0 ? "跑赢" : "跑输"}满仓大盘 {Math.abs(diffVsMarket * 100).toFixed(1)} 个百分点
          </div>
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, padding: "14px 28px", borderRadius: 999, border: `3px solid ${rank.color}`, color: rank.color }}>{rank.label}</div>
      </div>
      <div style={{ marginTop: 40, display: "flex", gap: 12 }}>
        {blocks.map((c, i) => (
          <div key={i} style={{ width: 64, height: 64, borderRadius: 12, background: c }} />
        ))}
      </div>
      <div style={{ marginTop: 28, display: "flex", gap: 16 }}>
        {moves.map((m) => (
          <div key={m.label} style={{ flex: 1, background: "#0D1117", borderRadius: 18, padding: "18px 22px" }}>
            <div style={{ fontSize: 24, color: "#8B95A3" }}>{m.label}</div>
            <div style={{ fontSize: 24, marginTop: 6, lineHeight: 1.4 }}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 28, fontSize: 22, color: "#8B95A3" }}>虚拟资金 · 历史数据不代表未来 · 不构成任何投资建议</div>
    </div>
  );
}
