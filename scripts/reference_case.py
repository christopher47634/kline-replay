"""独立于 TypeScript 引擎的结算手算：读 content/scripts/2015.json，按 README 的结算口径重算附录 B 固定打法，
输出 docs/reference-case-2015.json（被 src/game/__tests__/reference-case.test.ts 逐月比对）。

用法：python scripts/reference_case.py          # 重新生成
      python scripts/reference_case.py --check  # 只校验 json 是否与手算一致（CI 可用）
"""
import json, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ["sh50", "cyb", "bank", "baijiu", "cash", "margin"]


def a(*v):
    return dict(zip(ASSETS, v))


# 与 src/game/fixtures.ts 的 APPENDIX_B 相同
PLAY = [a(50, 30, 0, 0, 20, 0)] * 4 + [a(20, 40, 0, 0, 0, 40), a(0, 20, 0, 0, 80, 0)] + [a(0, 0, 0, 0, 100, 0)] * 3 + [a(40, 30, 10, 20, 0, 0)] * 3


def settle(cash, alloc, month, p):
    assert sum(alloc.values()) == 100
    total = 0.0
    liquidated = False
    for k in ["sh50", "cyb", "bank", "baijiu"]:
        total += cash * alloc[k] / 100 * (1 + month["returns"][k])
    total += cash * alloc["cash"] / 100 * (1 + p["cashMonthly"])
    m = p["marginLeverage"] * month["returns"]["sh50"] - p["marginCostMonthly"]
    if alloc["margin"] > 0 and m <= p["marginLiquidation"]:
        liquidated = True
    else:
        total += cash * alloc["margin"] / 100 * (1 + m)
    return total, liquidated


def build():
    s = json.load(open(ROOT / "content/scripts/2015.json", encoding="utf-8"))
    cash = s["startCash"]
    rows = []
    for i, alloc in enumerate(PLAY):
        after, liq = settle(cash, alloc, s["months"][i], s["params"])
        rows.append({"month": i + 1, "cashBefore": round(cash, 2), "cashAfter": round(after, 2), "liquidated": liq})
        cash = after
    return {
        "script": "2015",
        "play": "APPENDIX_B",
        "startCash": s["startCash"],
        "finalValue": round(cash, 2),
        "totalReturn": round(cash / s["startCash"] - 1, 6),
        "months": rows,
    }


if __name__ == "__main__":
    out = ROOT / "docs/reference-case-2015.json"
    data = build()
    if "--check" in sys.argv:
        cur = json.load(open(out, encoding="utf-8"))
        if cur != data:
            sys.exit("docs/reference-case-2015.json 与手算不一致，请运行 python scripts/reference_case.py")
        print("reference case OK")
    else:
        json.dump(data, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        open(out, "a").write("\n")
        print("written", out, data["finalValue"])
