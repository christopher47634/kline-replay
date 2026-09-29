"""Validate event decks against the long price files.

Usage: python scripts/validate_events.py [--fix]
Checks per event: date is a trading day (otherwise reports the next one; --fix rewrites it),
>= 60 trading days before and >= 20 after, numbers quoted in the text match the data
(day move / 20-day move), and difficulty is 1-3. Only `verify: true` cards count for the deck
statistics, and a deck whose up/down answers are more than 70% one-sided gets a warning.
Exit code 1 on any error.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRICES = ROOT / "content" / "data" / "prices"
EVENTS = ROOT / "content" / "events"
BEFORE, AFTER = 60, 20


def load_series(name: str):
    rows = json.loads((PRICES / f"{name}_long.json").read_text("utf-8"))["rows"]
    return [r[0] for r in rows], [r[1] for r in rows]


def check_event(ev: dict, dates: list[str], closes: list[float]) -> tuple[list[str], list[str], dict]:
    """Return (errors, warnings, facts). Pure function so it can be unit-tested."""
    errors, warnings = [], []
    idx = {d: i for i, d in enumerate(dates)}
    date = ev.get("date", "")
    facts: dict = {}
    if date not in idx:
        nxt = next((d for d in dates if d >= date), None)
        warnings.append(f"{ev.get('id')}: {date} is not a trading day, next is {nxt}")
        facts["next_trading_day"] = nxt
        if nxt is None:
            errors.append(f"{ev.get('id')}: date beyond data")
            return errors, warnings, facts
        date = nxt
    i = idx[date]
    if i < BEFORE:
        errors.append(f"{ev.get('id')}: only {i} days before, need {BEFORE}")
    if i + AFTER >= len(dates):
        errors.append(f"{ev.get('id')}: only {len(dates) - 1 - i} days after, need {AFTER}")
    if errors:
        return errors, warnings, facts
    day = closes[i] / closes[i - 1] - 1
    after = closes[i + AFTER] / closes[i] - 1
    facts.update(day=day, after=after)
    if ev.get("difficulty") not in (1, 2, 3):
        errors.append(f"{ev.get('id')}: difficulty must be 1-3")
    # Numbers quoted in the text must agree with the data (within rounding).
    m = re.search(r"当日[^%。；]{0,14}?(\d+\.\d)%", ev.get("hindsight", ""))
    if m and abs(float(m.group(1)) - abs(day) * 100) > 0.15:
        errors.append(f"{ev.get('id')}: text says day move {m.group(1)}% but data says {day * 100:+.1f}%")
    m = re.search(r"此后 20 个交易日[^%。；]{0,14}?(\d+\.\d)%", ev.get("hindsight", ""))
    if m and abs(float(m.group(1)) - abs(after) * 100) > 0.15:
        errors.append(f"{ev.get('id')}: text says 20-day move {m.group(1)}% but data says {after * 100:+.1f}%")
    if ev.get("verify") and abs(after) < 0.01:
        errors.append(f"{ev.get('id')}: verified card with a flat answer ({after * 100:+.2f}%)")
    return errors, warnings, facts


def main(fix: bool = False) -> int:
    total_err = 0
    for f in sorted(EVENTS.glob("*.json")):
        deck = json.loads(f.read_text("utf-8"))
        try:
            dates, closes = load_series(deck["index"])
        except FileNotFoundError:
            print(f"{f.name}: price file for '{deck['index']}' missing - deck unavailable")
            total_err += 1
            continue
        ups = downs = 0
        changed = False
        for ev in deck["events"]:
            errs, warns, facts = check_event(ev, dates, closes)
            for w in warns:
                print("WARN ", w)
            if fix and facts.get("next_trading_day"):
                ev["date"] = facts["next_trading_day"]
                changed = True
            for e in errs:
                print("ERROR", e)
            total_err += len(errs)
            if ev.get("verify") and "after" in facts:
                ups += facts["after"] > 0
                downs += facts["after"] <= 0
        if changed:
            f.write_text(json.dumps(deck, ensure_ascii=False, indent=1), "utf-8")
        n = ups + downs
        skipped = sum(1 for e in deck["events"] if not e.get("verify"))
        share = max(ups, downs) / n if n else 0
        print(f"{f.name}: {n} verified cards (+{skipped} unverified) | up {ups} / down {downs}")
        if share > 0.70:
            print(f"WARN  {f.name}: answers are {share:.0%} one-sided - a 'always guess {'up' if ups > downs else 'down'}' strategy wins")
    print("OK" if not total_err else f"{total_err} error(s)")
    return 1 if total_err else 0


if __name__ == "__main__":
    sys.exit(main("--fix" in sys.argv))
