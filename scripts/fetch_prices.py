"""Fetch daily prices for every scripted asset via akshare.

Usage: python scripts/fetch_prices.py [2015 2020]
Output: content/data/prices/{asset}_{year}.json + content/data/manifest.json
"""
from __future__ import annotations

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import akshare as ak

ROOT = Path(__file__).resolve().parent.parent
PRICES_DIR = ROOT / "content" / "data" / "prices"
MANIFEST = ROOT / "content" / "data" / "manifest.json"


def _etf(code):
    return lambda s, e: ak.fund_etf_hist_em(symbol=code, period="daily", start_date=s, end_date=e, adjust="qfq")


def _index(code):
    return lambda s, e: ak.index_zh_a_hist(symbol=code, period="daily", start_date=s, end_date=e)


def _stock(code):
    return lambda s, e: ak.stock_zh_a_hist(symbol=code, period="daily", start_date=s, end_date=e, adjust="qfq")


def _sw(code):
    def f(s, e):
        df = ak.index_hist_sw(symbol=code, period="day")
        df = df.rename(columns={"日期": "日期", "收盘": "收盘", "成交量": "成交量"})
        df["日期"] = df["日期"].astype(str)
        return df[(df["日期"] >= f"{s[:4]}-{s[4:6]}-{s[6:]}") & (df["日期"] <= f"{e[:4]}-{e[4:6]}-{e[6:]}")]
    return f


def _csindex(code):
    def f(s, e):
        df = ak.stock_zh_index_hist_csindex(symbol=code, start_date=s, end_date=e)
        df = df[df["收盘"].notna()].copy()
        df["日期"] = df["日期"].astype(str)
        # csindex occasionally emits a weekend base row; keep trading days only
        wd = __import__("pandas").to_datetime(df["日期"]).dt.weekday
        return df[wd < 5]
    return f


def _sina_stock(code):
    def f(s, e):
        df = ak.stock_zh_a_daily(symbol=code, start_date=s, end_date=e, adjust="qfq")
        return df.rename(columns={"date": "日期", "close": "收盘", "volume": "成交量"})
    return f


def _sina_index(code):
    def f(s, e):
        df = ak.stock_zh_index_daily(symbol=code)
        df = df.rename(columns={"date": "日期", "close": "收盘", "volume": "成交量"})
        df["日期"] = df["日期"].astype(str)
        return df[(df["日期"] >= f"{s[:4]}-{s[4:6]}-{s[6:]}") & (df["日期"] <= f"{e[:4]}-{e[4:6]}-{e[6:]}")]
    return f


# asset id -> ordered list of (source label, fetcher)
SOURCES = {
    "sh50": [("akshare.fund_etf_hist_em:510050", _etf("510050")), ("akshare.index_zh_a_hist:000016", _index("000016")),
             ("akshare.stock_zh_index_daily:sh000016", lambda s, e: _sina_index("sh000016")(s, e))],
    "cyb": [("akshare.fund_etf_hist_em:159915", _etf("159915")), ("akshare.index_zh_a_hist:399006", _index("399006")),
            ("akshare.stock_zh_index_daily:sz399006", lambda s, e: _sina_index("sz399006")(s, e))],
    "bank": [
        ("akshare.index_zh_a_hist:399986", _index("399986")),
        ("akshare.stock_zh_index_hist_csindex:399986", _csindex("399986")),
        ("akshare.index_hist_sw:801780", _sw("801780")),
        ("akshare.stock_zh_a_hist:600036", _stock("600036")),
    ],
    "baijiu": [("akshare.index_zh_a_hist:399997", _index("399997")), ("akshare.stock_zh_index_hist_csindex:399997", _csindex("399997")),
               ("akshare.stock_zh_a_hist:600519", _stock("600519")), ("akshare.stock_zh_a_daily:sh600519", _sina_stock("sh600519"))],
    "market": [("akshare.index_zh_a_hist:000001", _index("000001")), ("akshare.stock_zh_index_daily:sh000001", _sina_index("sh000001"))],
}


def _retry(fn, start, end, attempts=4):
    last = None
    for k in range(attempts):
        try:
            return fn(start, end)
        except Exception as exc:  # eastmoney drops connections under load; back off and retry
            last = exc
            time.sleep(3 * (k + 1))
    raise last


def _sina_etf(code):
    def f(s, e):
        df = ak.fund_etf_hist_sina(symbol=code)
        df = df.rename(columns={"date": "日期", "close": "收盘", "volume": "成交量"})
        df["日期"] = df["日期"].astype(str)
        return df[(df["日期"] >= f"{s[:4]}-{s[4:6]}-{s[6:]}") & (df["日期"] <= f"{e[:4]}-{e[4:6]}-{e[6:]}")]
    return f


# Before 2010 there was no ChiNext (创业板) and no liquor index: the growth slot is the SME-board ETF (中小板ETF 159902,
# listed 2006-09) and the liquor slot is Kweichow Moutai. The script's asset names say so (scripts/timelines/*.headlines.json).
EARLY = {
    "cyb": [("akshare.fund_etf_hist_sina:sz159902", _sina_etf("sz159902")), ("akshare.fund_etf_hist_em:159902", _etf("159902"))],
    "bank": [("akshare.stock_zh_index_hist_csindex:399986", _csindex("399986")), ("akshare.index_zh_a_hist:399986", _index("399986"))],
    "baijiu": [("akshare.stock_zh_a_daily:sh600519", _sina_stock("sh600519")), ("akshare.stock_zh_a_hist:600519", _stock("600519"))],
}


def sources_for(asset: str, year: int):
    return EARLY.get(asset, SOURCES[asset]) if year < 2010 else SOURCES[asset]


def fetch(asset: str, year: int):
    start, end = f"{year - 1}1101", f"{year}1231"
    errors = []
    for i, (label, fn) in enumerate(sources_for(asset, year)):
        try:
            df = _retry(fn, start, end)
            if df is None or len(df) == 0:
                raise RuntimeError("empty frame")
            rows = []
            for _, r in df.iterrows():
                d = str(r["日期"])[:10]
                rows.append([d, round(float(r["收盘"]), 4), float(r.get("成交量", 0) or 0)])
            rows.sort(key=lambda x: x[0])
            return label, i > 0, rows, errors
        except Exception as exc:  # akshare endpoints change often; fall through to backup
            errors.append(f"{label}: {exc!r}")
            print(f"  [warn] {asset} {label} failed: {exc!r}", file=sys.stderr)
    avail = [n for n in dir(ak) if n.startswith(("index_", "fund_etf"))][:40]
    raise SystemExit(f"all sources failed for {asset} {year}: {errors}\navailable: {avail}")


def validate(asset, year, rows):
    in_year = [r for r in rows if r[0].startswith(str(year))]
    dates = [r[0] for r in rows]
    if not 230 <= len(in_year) <= 250:
        raise SystemExit(f"{asset}_{year}: {len(in_year)} trading days in {year}, expected 230-250")
    if len(set(dates)) != len(dates):
        raise SystemExit(f"{asset}_{year}: duplicate dates")
    if any(r[1] <= 0 for r in rows):
        raise SystemExit(f"{asset}_{year}: non-positive close")
    return len(in_year)


def main():
    years = [int(a) for a in sys.argv[1:]] or [2015, 2020]
    PRICES_DIR.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text("utf-8")) if MANIFEST.exists() else {"files": {}}
    for year in years:
        for asset in SOURCES:
            print(f"fetching {asset} {year} ...")
            label, fallback, rows, errors = fetch(asset, year)
            n_year = validate(asset, year, rows)
            now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            out = {"asset": asset, "year": year, "source": label, "fetched_at": now, "rows": rows}
            name = f"{asset}_{year}.json"
            (PRICES_DIR / name).write_text(json.dumps(out, ensure_ascii=False), "utf-8")
            manifest["files"][name] = {
                "source": label,
                "fallbackUsed": fallback,
                "primaryErrors": errors,
                "rows": len(rows),
                "tradingDaysInYear": n_year,
                "first": rows[0][0],
                "last": rows[-1][0],
                "fetchedAt": now,
            }
            print(f"  ok {name}: {len(rows)} rows ({n_year} in {year}) via {label}")
    manifest["updatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), "utf-8")


if __name__ == "__main__":
    main()
