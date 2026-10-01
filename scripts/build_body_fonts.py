"""Subset the two optional body fonts to every character the site can show.

Usage: python scripts/build_body_fonts.py
  霞鹜文楷 · 屏幕版 (LXGW WenKai Screen, OFL)  -> public/fonts/wenkai-subset.woff2
  思源宋体 Noto Serif SC 400 (OFL)             -> public/fonts/serif-subset.woff2
Sources are the unicode-range slices shipped in node_modules (dev dependencies only). Characters come from
every content JSON and every src file. They are only downloaded when a reader picks that font in 阅读设置.
Re-run after adding content.
"""
from __future__ import annotations

import io
import re
from pathlib import Path

from fontTools import subset
from fontTools.merge import Merger
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
NM = ROOT / "node_modules"


def collect() -> set[int]:
    chars: set[str] = set(chr(c) for c in range(0x20, 0x7F))
    chars.update("，。、：；？！“”‘’（）《》「」—…·×+−%～→←↑↓")
    for base, exts in [(ROOT / "content", (".json", ".txt")), (ROOT / "src", (".ts", ".tsx"))]:
        for p in base.rglob("*"):
            if p.suffix in exts and p.is_file():
                chars.update(p.read_text("utf-8", errors="ignore"))
    return {ord(c) for c in chars if ord(c) >= 0x20}


def in_range(cp: int, rng: str) -> bool:
    for part in rng.split(","):
        part = part.strip().lower().replace("u+", "")
        a, _, b = part.partition("-")
        lo, hi = int(a.replace("?", "0"), 16), int((b or a).replace("?", "f"), 16)
        if lo <= cp <= hi:
            return True
    return False


def build(css: Path, files: Path, out: Path, cps: set[int]) -> None:
    text = css.read_text("utf-8")
    parts: list[TTFont] = []
    for blk in re.findall(r"@font-face\s*\{([^}]*)\}", text):
        src = re.search(r"url\(['\"]?\./files/([^)'\"]+\.woff2)", blk)
        rng = re.search(r"unicode-range:\s*([^;}]+)", blk)  # the last declaration may have no semicolon
        if not src or not rng:
            continue
        need = [c for c in cps if in_range(c, rng.group(1))]
        if not need:
            continue
        f = TTFont(files / src.group(1))
        opts = subset.Options()
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        s = subset.Subsetter(opts)
        s.populate(unicodes=need)
        s.subset(f)
        buf = io.BytesIO()
        f.flavor = None
        f.save(buf)
        buf.seek(0)
        parts.append(buf)
    merged = Merger().merge(parts)
    merged.flavor = "woff2"
    out.parent.mkdir(parents=True, exist_ok=True)
    merged.save(out)
    print(f"{out.name}: {len(parts)} slices, {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    cps = collect()
    print(len(cps), "characters")
    wk = NM / "lxgw-wenkai-screen-webfont"
    build(wk / "lxgwwenkaigbscreen.css", wk / "files", ROOT / "public" / "fonts" / "wenkai-subset.woff2", cps)
    ns = NM / "@fontsource" / "noto-serif-sc"
    build(ns / "400.css", ns / "files", ROOT / "public" / "fonts" / "serif-subset.woff2", cps)
    # 纸面主题的标题和头条用真粗体（不是浏览器合成的假粗体）；只有用到时浏览器才会下载
    build(ns / "700.css", ns / "files", ROOT / "public" / "fonts" / "serif-bold-subset.woff2", cps)
