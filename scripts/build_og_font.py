"""Fetch a Noto Sans SC Black subset once and commit it, so /api/og never needs Google Fonts at runtime.

Usage: python scripts/build_og_font.py
Collects every character the OG card can show (script titles, persona and rank names, digits, symbols),
asks Google Fonts for exactly those glyphs (TrueType: satori cannot read woff2) and writes
src/app/api/og/NotoSansSC-Black-subset.ttf. Re-run after adding a script or persona.
"""
from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "app" / "api" / "og" / "NotoSansSC-Black-subset.ttf"
FIXED = "穿越K线你呢？大事件猜涨跌市场直觉0123456789+−-.%·：:，、 "


def collect() -> str:
    chars = set(FIXED)
    for f in sorted((ROOT / "content" / "scripts").glob("*.json")):
        s = json.loads(f.read_text("utf-8"))
        chars.update(s["title"])
    for p in json.loads((ROOT / "content" / "personas.json").read_text("utf-8")).values():
        chars.update(p["title"])
    engine = (ROOT / "src" / "game" / "engine.ts").read_text("utf-8")
    for label in re.findall(r'label: "([^"]+)"', engine):
        chars.update(label)
    # event-mode decks and titles, when present
    for f in sorted((ROOT / "content" / "events").glob("*.json")) if (ROOT / "content" / "events").exists() else []:
        chars.update(json.loads(f.read_text("utf-8")).get("title", ""))
    extra = ROOT / "content" / "og_extra_chars.txt"
    if extra.exists():
        chars.update(extra.read_text("utf-8").strip())
    return "".join(sorted(chars))


def main():
    text = collect()
    css_url = "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@900&text=" + urllib.parse.quote(text)
    css = urllib.request.urlopen(urllib.request.Request(css_url, headers={"User-Agent": "Mozilla/5.0"}), timeout=30).read().decode()
    m = re.search(r"src: url\((.+?)\) format\('(\w+)'\)", css)
    if not m:
        raise SystemExit("no font url in css: " + css[:200])
    url, fmt = m.groups()
    data = urllib.request.urlopen(url, timeout=60).read()
    if fmt == "woff2":
        raise SystemExit("got woff2; satori needs ttf/otf/woff — retry with an older User-Agent")
    OUT.write_bytes(data)
    print(f"{len(text)} glyphs -> {OUT.relative_to(ROOT)} ({len(data) / 1024:.1f} KB, {fmt})")


if __name__ == "__main__":
    main()
