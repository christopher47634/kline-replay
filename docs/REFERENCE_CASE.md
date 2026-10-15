# 固定参考案例：锁定结算口径

目的：结算口径（每月怎么算钱）一旦被改动，测试必须立刻红。这个案例由**独立于 TypeScript 引擎的 Python 手算**生成，引擎和手算对不上就不能合并。

## 案例

- 剧本：`content/scripts/2015.json`（2015 疯牛与股灾），开局资金 100,000
- 打法：附录 B 固定打法，即 `src/game/fixtures.ts` 的 `APPENDIX_B`
  - 1–4 月：上证50 50% / 创业板 30% / 现金 20%
  - 5 月：上证50 20% / 创业板 40% / 融资 40%
  - 6 月：创业板 20% / 现金 80%
  - 7–9 月：全现金
  - 10–12 月：上证50 40% / 创业板 30% / 银行 10% / 白酒 20%
- 期望结果：年末 **174,293.31**，全年收益 **+74.2933%**，全程无强平。逐月金额见 [`reference-case-2015.json`](reference-case-2015.json)。

## 结算口径（被这个案例锁定的部分）

每月按月初资金 `cash`、仓位百分比 `w` 和脚本里的月收益 `r` 计算：

- 上证50 / 创业板 / 银行 / 白酒：`cash × w × (1 + r)`
- 现金（货币基金）：`cash × w × (1 + cashMonthly)`，2015 年 `cashMonthly = 0.3%`
- 融资（2 倍做多上证50）：月收益 `m = 2 × r_sh50 − 0.7%`；`m ≤ −50%` 时当月强平，该仓位归零（其余仓位不受影响），否则 `cash × w × (1 + m)`
- 月末资金 = 各部分之和，下月以此为 `cash`；仓位必须是整数百分比且合计 100
- 日线曲线（`simulateDaily`）只用来画图和配乐，月末对齐到上述结算结果，不参与结算

## 怎么复现 / 校验

```bash
python scripts/reference_case.py          # 重新生成 docs/reference-case-2015.json
python scripts/reference_case.py --check  # 只校验 json 与手算一致（仅用 Python 标准库）
npm test                                  # src/game/__tests__/reference-case.test.ts 逐月比对引擎
```

测试还固定了三条边界：强平阈值恰好等于 −50% 时强平、略高于阈值时不强平、强平只清零融资仓位而现金仓位照常计息。

## 有意改口径时

1. 先改 `src/game/engine.ts`，并在 `CHANGELOG.md` 写明改了什么、为什么；
2. 同步改 `scripts/reference_case.py` 里的手算，重新生成 json；
3. 注意结果链接 `/result?s=...` 是每次按当前引擎重算的，口径改动会改变历史链接显示的数字。
