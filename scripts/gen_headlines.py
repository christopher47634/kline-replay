"""Draft headlines from a timeline with an LLM (Prompt A). Drafts are NEVER used directly.

Usage: python scripts/gen_headlines.py 2015
Reads:  scripts/timelines/{year}.md            (## 0 月 ... ## 12 月 blocks)
Writes: scripts/timelines/{year}.draft.json    -> review by hand -> {year}.headlines.json

Round N (month index N-1) headlines use the events of the previous month block,
hindsight uses the month's own block. Signal alternates true/false (6 + 6).
Needs DEEPSEEK_API_KEY; optional DEEPSEEK_BASE_URL / DEEPSEEK_MODEL.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent

PROMPT_A = """你是 {year} 年 {month} 月初一家中国财经媒体的编辑。以下是截至本月初已经发生的事件要点：
{events}

本月之后事后复盘可参考（仅用于 hindsight 字段，headlines 与 rumor 不得透露）：
{after}

请严格输出 JSON，不要输出其他内容：
{{
  "headlines": ["", "", ""],
  "rumor": "",
  "rumorIsSignal": {signal},
  "hindsight": ""
}}
要求：
- headlines：3 条，每条 ≤ 25 字，像当年的财经头条，只写已发生的事，不预测未来，不出现任何真实自然人姓名，不出现具体点位预测，不出现"建议买入/卖出"。
- rumor：≤ 40 字，第一人称，股吧口吻，像"我表哥在券商上班说……"。
- rumorIsSignal 为 {signal}：true 时 rumor 隐晦地指向本月真实方向但说得像吹牛；false 时 rumor 与本月走势无关，是纯噪音。
- hindsight：≤ 60 字，站在事后角度解释这个月发生了什么、为什么，用于结算后复盘。
"""


def parse_blocks(md: str) -> dict[int, str]:
    blocks, cur = {}, None
    for line in md.splitlines():
        m = re.match(r"^##\s*(\d+)\s*月", line)
        if m:
            cur = int(m.group(1))
            blocks[cur] = ""
        elif cur is not None and line.strip():
            blocks[cur] += line.strip() + "\n"
    return blocks


def call_llm(prompt: str) -> dict:
    key = os.environ["DEEPSEEK_API_KEY"]
    base = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    model = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
    r = requests.post(
        f"{base}/chat/completions",
        headers={"Authorization": f"Bearer {key}"},
        json={"model": model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.7,
              "response_format": {"type": "json_object"}},
        timeout=60,
    )
    r.raise_for_status()
    return json.loads(r.json()["choices"][0]["message"]["content"])


def main():
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2015
    if not os.environ.get("DEEPSEEK_API_KEY"):
        raise SystemExit("DEEPSEEK_API_KEY not set; write drafts by hand following Prompt A instead")
    blocks = parse_blocks((ROOT / "scripts" / "timelines" / f"{year}.md").read_text("utf-8"))
    drafts = []
    for i in range(12):
        signal = "true" if i % 2 == 0 else "false"
        prompt = PROMPT_A.format(year=year, month=i + 1, events=blocks.get(i, ""), after=blocks.get(i + 1, ""), signal=signal)
        out = call_llm(prompt)
        out["rumorIsSignal"] = signal == "true"
        drafts.append(out)
        print(f"month {i + 1}: {out['headlines']}")
    path = ROOT / "scripts" / "timelines" / f"{year}.draft.json"
    path.write_text(json.dumps({"months": drafts}, ensure_ascii=False, indent=2), "utf-8")
    print(f"wrote {path.relative_to(ROOT)} - review against the checklist before copying into {year}.headlines.json")


if __name__ == "__main__":
    main()
