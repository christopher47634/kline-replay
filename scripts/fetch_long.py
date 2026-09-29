"""Fetch full-history daily closes for the event mode (Shanghai Composite 1990s-now, S&P 500).

Usage: python scripts/fetch_long.py
Output: content/data/prices/market_long.json, spx_long.json  (rows: [date, close])
        content/data/manifest.json gets a `long` section with source, row count and span.
A source that fails is recorded as unavailable instead of aborting: the deck that needs it is then
hidden by validate_events.py, everything else still builds.
"""
from __future__ import annotations

import json
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import akshare as ak

ROOT = Path(__file__).resolve().parent.parent
PRICES = ROOT / "content" / "data" / "prices"
MANIFEST = ROOT / "content" / "data" / "manifest.json"


def _sina_sh():
    df = ak.stock_zh_index_daily(symbol="sh000001")
    return [(str(d)[:10], float(c)) for d, c in zip(df["date"], df["close"])]


def _spx_index():
    df = ak.index_us_stock_sina(symbol=".INX")
    return [(str(d)[:10], float(c)) for d, c in zip(df["date"], df["close"])]


def _spx_daily():
    df = ak.stock_us_daily(symbol="SPX")
    return [(str(d)[:10], float(c)) for d, c in zip(df["date"], df["close"])]


def _spx_yahoo():
    """Full history since 1928 (akshare's Sina feed only starts in 2004, too late for 1987-2001 events)."""
    import urllib.request

    url = "https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?period1=-1325635200&period2=4102444800&interval=1d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    res = json.loads(urllib.request.urlopen(req, timeout=40).read())["chart"]["result"][0]
    out = []
    for ts, c in zip(res["timestamp"], res["indicators"]["quote"][0]["close"]):
        if c is not None:
            # exchange-local calendar date (gmtoffset is in seconds)
            out.append(((datetime(1970, 1, 1) + timedelta(seconds=ts + res["meta"]["gmtoffset"])).strftime("%Y-%m-%d"), float(c)))
    return out


SERIES = {
    "market_long": [("akshare.stock_zh_index_daily:sh000001", _sina_sh)],
    "spx_long": [("yahoo.chart:^GSPC", _spx_yahoo), ("akshare.index_us_stock_sina:.INX", _spx_index), ("akshare.stock_us_daily:SPX", _spx_daily)],
}


def fetch(name, sources):
    errors = []
    for label, fn in sources:
        for attempt in range(4):
            try:
                rows = fn()
                if len(rows) < 1000:
                    raise RuntimeError(f"only {len(rows)} rows")
                rows = sorted(set(rows))
                return {"source": label, "fallbackUsed": bool(errors), "errors": errors, "rows": rows}
            except Exception as e:  # noqa: BLE001 - network sources fail in many ways
                errors.append(f"{label}: {type(e).__name__}({str(e)[:120]})")
                time.sleep(1.5 * (attempt + 1))
    return {"source": None, "fallbackUsed": True, "errors": errors, "rows": []}


def main():
    manifest = json.loads(MANIFEST.read_text("utf-8")) if MANIFEST.exists() else {"files": {}}
    long = {}
    for name, sources in SERIES.items():
        r = fetch(name, sources)
        rows = r["rows"]
        if rows:
            (PRICES / f"{name}.json").write_text(
                json.dumps({"source": r["source"], "rows": [[d, round(c, 4)] for d, c in rows]}, ensure_ascii=False, separators=(",", ":")), "utf-8")
        long[name] = {
            "source": r["source"], "available": bool(rows), "fallbackUsed": r["fallbackUsed"], "primaryErrors": r["errors"],
            "rows": len(rows), "first": rows[0][0] if rows else None, "last": rows[-1][0] if rows else None,
            "fetchedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        print(name, long[name]["available"], long[name]["rows"], long[name]["first"], long[name]["last"], long[name]["primaryErrors"][:1])
    manifest["long"] = long
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1), "utf-8")


if __name__ == "__main__":
    main()
