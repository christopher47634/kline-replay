"""Subset the display font (得意黑 Smiley Sans, OFL) to the characters the UI headings can show.

Usage: python scripts/build_fonts.py
Reads every script / persona / event title plus content/display_chars.txt (fixed headings) and writes
public/fonts/smiley-subset.woff2. The source font is downloaded once to scripts/.cache/ (git-ignored).
Re-run after adding a script, persona or event card.
"""
from __future__ import annotations

import json
import re
import urllib.request
import zipfile
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache"
OUT = ROOT / "public" / "fonts" / "smiley-subset.woff2"
URL = "https://github.com/atelier-anchor/smiley-sans/releases/download/v2.0.1/smiley-sans-v2.0.1.zip"
ASCII = "".join(chr(c) for c in range(0x20, 0x7F))
EXTRA = "，。、：；？！“”‘’（）—…·×+−%～→←↑↓▲▼✓✕"


def source_font() -> Path:
    CACHE.mkdir(parents=True, exist_ok=True)
    otf = CACHE / "SmileySans-Oblique.otf"
    if not otf.exists():
        zpath = CACHE / "smiley.zip"
        urllib.request.urlretrieve(URL, zpath)
        with zipfile.ZipFile(zpath) as z:
            z.extract("SmileySans-Oblique.otf", CACHE)
    return otf


def collect() -> str:
    chars = set(ASCII + EXTRA)
    for f in sorted((ROOT / "content" / "scripts").glob("*.json")):
        s = json.loads(f.read_text("utf-8"))
        chars.update(s["title"] + s["subtitle"])
    for p in json.loads((ROOT / "content" / "personas.json").read_text("utf-8")).values():
        chars.update(p["title"] + p["desc"])
    engine = (ROOT / "src" / "game" / "engine.ts").read_text("utf-8")
    for label in re.findall(r'label: "([^"]+)"', engine):
        chars.update(label)
    ev = ROOT / "content" / "events"
    for f in sorted(ev.glob("*.json")) if ev.exists() else []:
        deck = json.loads(f.read_text("utf-8"))
        chars.update(deck["title"])
        for e in deck["events"]:
            chars.update(e["title"])
    engine_titles = (ROOT / "src" / "events" / "engine.ts").read_text("utf-8")
    for label in re.findall(r'label: "([^"]+)"', engine_titles):
        chars.update(label)
    extra = ROOT / "content" / "display_chars.txt"
    if extra.exists():
        chars.update(extra.read_text("utf-8").replace("\n", ""))
    return "".join(sorted(chars))


def main():
    text = collect()
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.notdef_outline = True
    font = subset.load_font(str(source_font()), opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    subset.save_font(font, str(OUT), opts)
    print(f"{len(text)} chars -> {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    main()
