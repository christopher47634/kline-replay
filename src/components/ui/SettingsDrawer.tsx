"use client";

import { FONTS, LEADINGS, SCALES, SKINS, VOICES, resetPrefs, resolve, setPrefs, skinMeta, usePrefs } from "@/lib/prefs";
import { Drawer, useDrawer } from "./Drawer";

/** The 阅读设置 drawer itself: loaded on first open so it stays out of every page's first-load bundle. */
export default function SettingsDrawer({ onClose }: { onClose: () => void }) {
  return (
    <Drawer open onClose={onClose} title="阅读设置">
      <Body />
    </Drawer>
  );
}

function Seg<T extends string | number>({ label, value, items, onPick }: { label: string; value: T; items: readonly (readonly [T, string])[]; onPick: (v: T) => void }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {items.map(([v, l]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} onClick={() => onPick(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className="text-sub">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

function Body() {
  const p = usePrefs();
  const r = resolve(p);
  const { push } = useDrawer();
  const si = (SCALES as readonly number[]).indexOf(p.scale);
  return (
    <>
      <div className="dr-group">
        <h3 className="dr-h">主题</h3>
        <div className="skin-cards" role="radiogroup" aria-label="主题">
          {SKINS.map((k) => (
            <button key={k.id} type="button" role="radio" aria-checked={p.skin === k.id} className="skin-card" onClick={() => setPrefs({ skin: k.id })}>
              <span className={`skin-mini mini-${k.id}`} aria-hidden>
                <i />
                <i />
                <i />
                <i />
              </span>
              <b>{k.name}</b>
              <span>{k.who}</span>
            </button>
          ))}
        </div>
        <p className="dr-note">{skinMeta(p.skin).traits.join(" · ")}。主题带一套默认字体和复盘文风，下面可以单独改。</p>
      </div>

      <div className="dr-group">
        <h3 className="dr-h">字号</h3>
        <div className="size-row">
          <button type="button" aria-label="缩小字号" disabled={si <= 0} onClick={() => setPrefs({ scale: SCALES[si - 1] })}>
            −
          </button>
          <output className="text-center text-sm text-sub" aria-live="polite">
            {Math.round(p.scale * 100)}%
          </output>
          <button type="button" aria-label="放大字号" disabled={si >= SCALES.length - 1} onClick={() => setPrefs({ scale: SCALES[si + 1] })}>
            +
          </button>
        </div>
        <p className="size-preview">1 月 16 日盘后，证监会通报两融违规，19 日沪指跌 7.7%。</p>
      </div>

      <div className="dr-group">
        <h3 className="dr-h">行距</h3>
        <Seg label="行距" value={r.leading} items={LEADINGS.map((l) => [l.id, l.name] as const)} onPick={(v) => setPrefs({ leading: v })} />
      </div>

      <div className="dr-group">
        <h3 className="dr-h">正文与复盘</h3>
        <button type="button" className="dr-row" onClick={() => push({ key: "font", title: "正文字体", body: <FontPage /> })}>
          <span>字体</span>
          <span className="dr-val">
            {FONTS.find((f) => f.id === r.font)!.name}
            {p.font === "auto" ? "（跟随主题）" : ""}
          </span>
          <Chevron />
        </button>
        <button type="button" className="dr-row" onClick={() => push({ key: "voice", title: "复盘文风", body: <VoicePage /> })}>
          <span>复盘文风</span>
          <span className="dr-val">
            {VOICES.find((v) => v.id === r.voice)!.name}
            {p.voice === "auto" ? "（跟随主题）" : ""}
          </span>
          <Chevron />
        </button>
      </div>

      <div className="dr-group">
        <h3 className="dr-h">玻璃质感</h3>
        <Seg label="玻璃质感" value={p.glass} items={[["liquid", "液态"], ["frost", "磨砂"], ["off", "关闭"]] as const} onPick={(v) => setPrefs({ glass: v })} />
        <p className="dr-note">液态：折射、彩虹边、跟随光标的高光，只用在浮层按钮和放大镜上。系统开启「降低透明度」时自动关闭。</p>
      </div>

      <button type="button" className="dr-row" onClick={resetPrefs}>
        <span>恢复默认</span>
        <span className="dr-val">盘口 · 100%</span>
        <span />
      </button>
      <p className="dr-note">设置只保存在这台设备的浏览器里。</p>
    </>
  );
}

const SAMPLE = "1 月 16 日盘后，证监会通报券商两融违规，19 日沪指跌 7.7%；随后指数月末收复失地，创业板逆势大涨。";

function FontPage() {
  const p = usePrefs();
  const r = resolve(p);
  const auto = skinMeta(p.skin).font;
  return (
    <>
      <p className="dr-note">样张用同一段话。字体改正文和复盘；按钮、数字和标题不变。</p>
      <div className="dr-group" role="radiogroup" aria-label="正文字体">
        {FONTS.map((f) => (
          <button key={f.id} type="button" role="radio" aria-checked={r.font === f.id} className="opt" onClick={() => setPrefs({ font: f.id === auto ? "auto" : f.id })}>
            <span className="opt-head">
              <b>{f.name}</b>
              <span>
                {f.id === auto ? "当前主题默认 · " : ""}
                {f.license}
              </span>
            </span>
            <span className="opt-sample" style={{ fontFamily: f.family }}>
              {SAMPLE}
            </span>
            <span className="opt-note">{f.note}</span>
          </button>
        ))}
      </div>
    </>
  );
}

const VOICE_SAMPLE: Record<string, string> = {
  plain: "这个月你亏了 3.2%，比大盘多亏 2.5 个点——主要是银行拖了后腿。下个月可以想想：你还想押同一个方向吗？",
  standard: "事后复盘：1 月 16 日盘后证监会通报两融违规，19 日沪指跌 7.7%……\n老股民说：两融一查就吓一跳，下个月记得先看公告。",
  pro: "结论：跑输大盘 2.5 个百分点。归因：银行 −2.1pp、白酒 −0.4pp、创业板 +1.3pp；风险敞口 80% → 60%；月内最大回撤 −8.4%。",
};

function VoicePage() {
  const p = usePrefs();
  const r = resolve(p);
  const auto = skinMeta(p.skin).voice;
  return (
    <>
      <p className="dr-note">每个月的结算弹窗和年终结算页都按这里的文风写。三种写法用的是同一组数字，只是说法不同。</p>
      <div className="dr-group" role="radiogroup" aria-label="复盘文风">
        {VOICES.map((v) => (
          <button key={v.id} type="button" role="radio" aria-checked={r.voice === v.id} className="opt" onClick={() => setPrefs({ voice: v.id === auto ? "auto" : v.id })}>
            <span className="opt-head">
              <b>{v.name}</b>
              <span>{v.id === auto ? "当前主题默认" : ""}</span>
            </span>
            <span className="opt-sample whitespace-pre-line text-[15px]">{VOICE_SAMPLE[v.id]}</span>
            <span className="opt-note">{v.note}</span>
          </button>
        ))}
      </div>
      <p className="dr-note">样张是示意；游戏里的每个数字都由你当月的真实仓位和真实行情算出来。</p>
    </>
  );
}
