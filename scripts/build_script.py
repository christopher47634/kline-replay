"""Build a playable script JSON from fetched prices + reviewed headlines.

Usage: python scripts/build_script.py 2015
Reads:  content/data/prices/{asset}_{year}.json
        scripts/timelines/{year}.headlines.json   (reviewed copy, never the draft)
Writes: content/scripts/{year}.json, then runs validate_script.py on it.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRICES = ROOT / "content" / "data" / "prices"
OUT_DIR = ROOT / "content" / "scripts"
TRADED = ["sh50", "cyb", "bank", "baijiu", "market"]


def load_closes(asset, year):
    data = json.loads((PRICES / f"{asset}_{year}.json").read_text("utf-8"))
    return {r[0]: r[1] for r in data["rows"]}, data["source"]


OUTLETS = ["财经晨报", "证券时报（虚构）", "每日财讯", "财经观察", "市场周刊"]  # all fictional
BULL = "涨升增创新高降息降准利好放量突破回升反弹上调加仓入市扩容松绑刺激".replace(" ", "")
BEAR = "跌降亏爆恐慌熔断收紧清查处罚减持下调暴挫崩退缩限强平违规去杠杆"


def tone_of(text):
    """Rough keyword tone for headlines that don't carry an explicit one."""
    if "降息" in text or "降准" in text:
        return "bull"
    b = sum(text.count(c) for c in set(BULL))
    d = sum(text.count(c) for c in set(BEAR) if c != "降")
    return "bull" if b > d else "bear" if d > b else "neutral"


def norm_headline(h, month_i, pos):
    """Old format is a plain string; new format is {text, outlet, day, tone}. Fill any gaps deterministically."""
    if isinstance(h, str):
        h = {"text": h}
    seed = int(hashlib.md5(f"{month_i}:{h['text']}".encode("utf-8")).hexdigest()[:8], 16)
    return {
        "text": h["text"],
        "outlet": h.get("outlet") or OUTLETS[(month_i + pos) % len(OUTLETS)],
        "day": h.get("day") or 1 + seed % 28,
        "tone": h.get("tone") or tone_of(h["text"]),
    }


def r4(x):
    return round(x, 6)


def main():
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2015
    content = json.loads((ROOT / "scripts" / "timelines" / f"{year}.headlines.json").read_text("utf-8"))
    params = content["params"]

    closes, sources = {}, {}
    for a in TRADED:
        closes[a], sources[a] = load_closes(a, year)

    # Use the intersection of trading dates so every asset has a value each day.
    common = sorted(set.intersection(*(set(c) for c in closes.values())))
    prev_year = [d for d in common if d < f"{year}-01-01"]
    in_year = [d for d in common if d.startswith(str(year))]
    if not prev_year:
        raise SystemExit("need at least one trading day before the year for a base close")

    months = []
    month_end_market = []
    prev_day = prev_year[-1]
    for m in range(12):
        prefix = f"{year}-{m + 1:02d}"
        days = [d for d in in_year if d.startswith(prefix)]
        base_day = prev_day
        daily = []
        pd = prev_day
        for d in days:
            daily.append({"date": d, "r": {a: r4(closes[a][d] / closes[a][pd] - 1) for a in TRADED}})
            pd = d
        end_day = days[-1]
        rets = {a: r4(closes[a][end_day] / closes[a][base_day] - 1) for a in TRADED}
        returns = {a: rets[a] for a in ["sh50", "cyb", "bank", "baijiu"]}
        returns["cash"] = params["cashMonthly"]
        returns["margin"] = r4(params["marginLeverage"] * rets["sh50"] - params["marginCostMonthly"])
        c = content["months"][m]
        months.append({
            "index": m,
            "label": f"{year} 年 {m + 1} 月",
            "headlines": [norm_headline(h, m, k) for k, h in enumerate(c["headlines"])],
            "rumor": c["rumor"],
            "rumorIsSignal": c["rumorIsSignal"],
            "hindsight": c["hindsight"],
            "marketReturn": rets["market"],
            "returns": returns,
            "daily": daily,
        })
        month_end_market.append(closes["market"][end_day])
        prev_day = end_day

    # preMonths: Nov/Dec of the previous year, so round 1 has context. If the fetched window
    # starts mid-month (no prior close), the month is measured from its first close instead.
    pre_months = []
    for mm in (11, 12):
        prefix = f"{year - 1}-{mm:02d}"
        days = [d for d in prev_year if d.startswith(prefix)]
        if not days:
            continue
        before = [d for d in common if d < days[0]]
        base = before[-1] if before else days[0]
        seq = days if before else days[1:]
        pd = base
        pdaily = []
        for d in seq:
            pdaily.append({"date": d, "r": {a: r4(closes[a][d] / closes[a][pd] - 1) for a in TRADED}})
            pd = d
        prets = {a: r4(closes[a][days[-1]] / closes[a][base] - 1) for a in TRADED}
        pre_months.append({
            "label": f"{year - 1} 年 {mm} 月",
            "marketReturn": prets["market"],
            "returns": {a: prets[a] for a in ["sh50", "cyb", "bank", "baijiu"]},
            "daily": pdaily,
        })

    peak = max(range(12), key=lambda i: month_end_market[i])
    trough = min(range(12), key=lambda i: month_end_market[i])
    all_in_market = month_end_market[-1] / closes["market"][prev_year[-1]] - 1
    all_cash = (1 + params["cashMonthly"]) ** 12 - 1

    script = {
        "id": str(year),
        "title": content["title"],
        "subtitle": content["subtitle"],
        "intro": content["intro"],
        "startCash": 100000,
        "peakMonth": peak,
        "troughMonth": trough,
        "assets": content["assets"],
        "params": params,
        "preMonths": pre_months,
        "months": months,
        "benchmarks": {
            "allInMarket": r4(all_in_market),
            "allCash": r4(all_cash),
            "retailAvg": content["retailAvg"],
            "retailAvgNote": content["retailAvgNote"],
        },
        "dataSources": sources,
        "sources": content["sources"],
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{year}.json"
    out.write_text(json.dumps(script, ensure_ascii=False, indent=1), "utf-8")
    print(f"wrote {out.relative_to(ROOT)}  peakMonth={peak} troughMonth={trough} allInMarket={all_in_market:+.2%}")
    for m in months:
        r = m["returns"]
        print(f"  {m['label']}: market {m['marketReturn']:+.1%}  sh50 {r['sh50']:+.1%}  cyb {r['cyb']:+.1%}  "
              f"bank {r['bank']:+.1%}  baijiu {r['baijiu']:+.1%}  margin {r['margin']:+.1%}  days {len(m['daily'])}")
    res = subprocess.run([sys.executable, str(ROOT / "scripts" / "validate_script.py"), str(out)])
    sys.exit(res.returncode)


if __name__ == "__main__":
    main()
