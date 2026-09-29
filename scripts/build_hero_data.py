"""Compact 2015 Shanghai Composite closes for the home-page particle field.

Usage: python scripts/build_hero_data.py
Writes src/components/hero/kline2015.json: {"prev": close of 2014-12-31, "closes": [...], "dates": [...], "peak": index of 2015-06-12}.
Only closes exist in the price file, so each bar's body runs from the previous close to its close (no wicks).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
rows = json.loads((ROOT / "content" / "data" / "prices" / "market_2015.json").read_text("utf-8"))["rows"]
prev = [r for r in rows if r[0] < "2015-01-01"][-1][1]
year = [r for r in rows if r[0].startswith("2015")]
out = {
    "prev": round(prev, 1),
    "closes": [round(r[1], 1) for r in year],
    "dates": [r[0] for r in year],
    "peak": next(i for i, r in enumerate(year) if r[0] == "2015-06-12"),
}
dst = ROOT / "src" / "components" / "hero" / "kline2015.json"
dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(json.dumps(out, separators=(",", ":")), "utf-8")
print(len(year), "bars, peak index", out["peak"], f"{dst.stat().st_size / 1024:.1f} KB")


# --- sparklines for the script cards + marquee headlines -------------------------------------------------
def closes_of(year):
    rows = json.loads((ROOT / "content" / "data" / "prices" / f"market_{year}.json").read_text("utf-8"))["rows"]
    return [r[1] for r in rows if r[0].startswith(str(year))]


def downsample(v, n=40):
    idx = [round(i * (len(v) - 1) / (n - 1)) for i in range(n)]
    lo, hi = min(v), max(v)
    return [round((v[i] - lo) / (hi - lo), 3) for i in idx]


spark = {str(y): downsample(closes_of(y)) for y in (2015, 2020)}
(dst.parent / "spark.json").write_text(json.dumps(spark, separators=(",", ":")), "utf-8")

script = json.loads((ROOT / "content" / "scripts" / "2015.json").read_text("utf-8"))
marquee = [{"day": f"{m['index']}月" if m["index"] else "12月", "text": m["headlines"][0]["text"]} for m in script["months"]]
(dst.parent / "marquee.json").write_text(json.dumps(marquee, ensure_ascii=False, separators=(",", ":")), "utf-8")
print("spark + marquee written")
