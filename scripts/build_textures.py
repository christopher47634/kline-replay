"""Generate the grain and paper textures (deterministic, no external assets).

Usage: python scripts/build_textures.py
Writes public/tex/grain.png (128x128 mono noise, tiled at ~3.5% opacity) and public/tex/paper.png
(256x256 low-frequency mottling + faint fibres for the archive-card pages).
"""
from __future__ import annotations

import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "tex"
SIZE = 256


def grain() -> Image.Image:
    rnd = random.Random(7)
    # 128 px tile, 8 grey levels: noise does not compress, so fewer levels keep it under the 8 KB budget.
    n = SIZE // 2
    img = Image.new("L", (n, n))
    img.putdata([min(7, max(0, int(rnd.gauss(3.5, 1.4)))) * 36 + 2 for _ in range(n * n)])
    return img


def paper() -> Image.Image:
    rnd = random.Random(11)
    base = Image.new("L", (SIZE, SIZE), 232)
    # low-frequency mottling: blur a coarse noise field, wrap-safe by tiling 3x3 before the crop
    coarse = Image.new("L", (SIZE // 8, SIZE // 8))
    coarse.putdata([rnd.randint(200, 255) for _ in range((SIZE // 8) ** 2)])
    big = coarse.resize((SIZE, SIZE), Image.BICUBIC).filter(ImageFilter.GaussianBlur(6))
    tiled = Image.new("L", (SIZE * 3, SIZE * 3))
    for x in range(3):
        for y in range(3):
            tiled.paste(big, (x * SIZE, y * SIZE))
    big = tiled.filter(ImageFilter.GaussianBlur(4)).crop((SIZE, SIZE, SIZE * 2, SIZE * 2))
    img = ImageChops.multiply(base, big.point(lambda v: 200 + v // 5))
    # fibres: short faint strokes, drawn wrapped so the tile repeats seamlessly
    d = ImageDraw.Draw(img)
    for _ in range(140):
        x, y = rnd.randint(0, SIZE - 1), rnd.randint(0, SIZE - 1)
        dx, dy = rnd.randint(-12, 12), rnd.randint(-5, 5)
        shade = rnd.randint(200, 226)
        for ox in (-SIZE, 0, SIZE):
            for oy in (-SIZE, 0, SIZE):
                d.line([(x + ox, y + oy), (x + ox + dx, y + oy + dy)], fill=shade, width=1)
    return img.filter(ImageFilter.GaussianBlur(0.4))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    grain().save(OUT / "grain.png", optimize=True)
    paper().convert("RGB").save(OUT / "paper.png", optimize=True)
    for f in ("grain.png", "paper.png"):
        print(f, f"{(OUT / f).stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
