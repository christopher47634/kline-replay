"""Validate a script JSON (schema + numeric ranges).

Usage: python scripts/validate_script.py content/scripts/2015.json
Exit code 1 on any error; reference-value drift only prints warnings.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ASSETS = ["sh50", "cyb", "bank", "baijiu", "cash", "margin"]
# Appendix B: approximate SSE Composite monthly returns (warning only)
REFERENCE = {
    "2015": [-0.008, 0.031, 0.132, 0.185, 0.038, -0.073, -0.143, -0.125, -0.048, 0.108, 0.019, 0.027],
}


def main(path):
    s = json.loads(Path(path).read_text("utf-8"))
    errors, warnings = [], []
    need = ["id", "title", "subtitle", "intro", "startCash", "peakMonth", "troughMonth", "assets", "params", "months", "benchmarks", "sources"]
    for k in need:
        if k not in s:
            errors.append(f"missing key {k}")
    if len(s.get("intro", "")) > 120:
        errors.append(f"intro longer than 120 chars ({len(s['intro'])})")
    months = s.get("months", [])
    if len(months) != 12:
        errors.append(f"expected 12 months, got {len(months)}")
    pre = s.get("preMonths")
    if not isinstance(pre, list) or len(pre) != 2:
        errors.append("preMonths must have 2 entries (previous Nov/Dec)")
    else:
        for pm in pre:
            if not pm.get("daily"):
                errors.append(f"preMonths {pm.get('label')}: empty daily")
    signals = 0
    for i, m in enumerate(months):
        tag = f"month {i}"
        if m.get("index") != i:
            errors.append(f"{tag}: index mismatch")
        if sorted(m.get("returns", {})) != sorted(ASSETS):
            errors.append(f"{tag}: returns keys {sorted(m.get('returns', {}))}")
        for a, v in m.get("returns", {}).items():
            if not -0.6 <= v <= 1.0:
                errors.append(f"{tag}: {a} return {v} out of [-0.6, 1.0]")
        hl = m.get("headlines", [])
        if len(hl) != 3:
            errors.append(f"{tag}: needs exactly 3 headlines")
        for h in hl:
            if not isinstance(h, dict) or not {"text", "outlet", "day", "tone"} <= set(h):
                errors.append(f"{tag}: headline must be an object with text/outlet/day/tone: {h}")
                continue
            if len(h["text"]) > 25:
                errors.append(f"{tag}: headline >25 chars: {h['text']}")
            if h["tone"] not in ("bull", "bear", "neutral") or not 1 <= h["day"] <= 28:
                errors.append(f"{tag}: bad tone/day on headline {h['text']}")
        if not m.get("rumor") or len(m["rumor"]) > 40:
            errors.append(f"{tag}: rumor missing or >40 chars")
        if not m.get("hindsight") or len(m["hindsight"]) > 60:
            errors.append(f"{tag}: hindsight missing or >60 chars ({len(m.get('hindsight', ''))})")
        if not isinstance(m.get("rumorIsSignal"), bool):
            errors.append(f"{tag}: rumorIsSignal must be bool")
        signals += bool(m.get("rumorIsSignal"))
        n = len(m.get("daily", []))
        if not 15 <= n <= 23:
            errors.append(f"{tag}: daily length {n} not in [15, 23]")
        text = "".join(h["text"] for h in hl if isinstance(h, dict)) + m.get("rumor", "")
        for banned in ["建议买入", "建议卖出"]:
            if banned in text:
                errors.append(f"{tag}: contains banned phrase {banned}")
        ref = REFERENCE.get(str(s.get("id")))
        if ref and "marketReturn" in m and abs(m["marketReturn"] - ref[i]) > 0.05:
            warnings.append(f"{tag}: market {m['marketReturn']:+.1%} vs reference {ref[i]:+.1%}")
    if months and signals != 6:
        warnings.append(f"rumorIsSignal true count = {signals}, expected 6")
    b = s.get("benchmarks", {})
    if "retailAvg" not in b or not -0.6 <= b["retailAvg"] <= 0.6:
        errors.append("benchmarks.retailAvg missing or out of [-0.6, 0.6]")
    for w in warnings:
        print(f"[warn] {w}")
    for e in errors:
        print(f"[error] {e}")
    print(f"validate {path}: {'FAIL' if errors else 'OK'} ({len(errors)} errors, {len(warnings)} warnings)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "content/scripts/2015.json"))
