# DECISIONS

日期 | 任务号 | 决策 | 理由
---|---|---|---
2026-09-28 | T01 | 选用 Next.js 15.5 + React 19，锁定版本 | 规格允许 14/15，15 为当前稳定线
2026-09-28 | T01 | Tailwind v4（CSS-first，无 tailwind.config.ts），颜色 token 写在 globals.css 的 @theme | create-next-app 默认 v4，v4 不需要 config 文件
2026-09-28 | T01 | 不引入 shadcn/ui，Button/Card/Dialog/Slider 用 Tailwind 手写小组件放 src/components/ui | 只需 6 个基础件，shadcn 初始化要交互 + 额外 radix 依赖；手写更轻、完全可控
2026-09-28 | T01 | Python 虚拟环境放仓库内 .venv（已 gitignore） | 本机 Python 3.14 全局无 akshare，隔离依赖
2026-09-28 | T02 | 东方财富指数接口（index_zh_a_hist）在本机网络下持续断连；bank/baijiu 改用中证指数官网 stock_zh_index_hist_csindex（同一指数 399986/399997），market 改用新浪 sh000001 | 仍是同一指数的官方/主流源，manifest 标注 fallbackUsed
2026-09-28 | T02 | 为每个数据源加 4 次指数退避重试 | 东方财富偶发 RemoteDisconnected
2026-09-28 | T03 | 回合信息视角：第 N 回合的头条写的是「回合开始时已发生」的事（即上月事件），hindsight 解释本回合月份 | 若头条写本月事件，玩家会先看到"沪指暴跌 7.7%"再决定本月仓位，等于剧透结算；时间线里加「0 月」= 上年 12 月
2026-09-28 | T04 | rumorIsSignal=true 表示小道消息隐晦指向「本回合月份」的真实方向（玩家正在为之分配的那个月） | 与上一条视角一致；偶数月 true、奇数月 false，保证 6 真 6 假
2026-09-28 | T04 | 本机未配置 DEEPSEEK_API_KEY，头条草稿由编码 Agent（Claude）按 Prompt A 直接撰写，再按 4.4 审核清单自审；gen_headlines.py 保留为有 Key 时的生成器 | 规格允许 Agent 自己按审核清单审核；长度等硬约束由 validate_script.py 机检
2026-09-28 | T05 | 剧本 JSON 额外字段：months[].marketReturn（上证综指月收益）与 dataSources | 事后点评、人格判定 chaser 规则和结算页都需要大盘月收益
2026-09-28 | T05 | 计算 peakMonth=4（5 月末 4612 为全年月末最高），troughMonth=8（9 月末 3053） | 以脚本为准；附录 B 手算用例的 top_escaper 仍命中（6 月在 peak±1 内）
2026-09-28 | T28 | 2020 货币基金取月 0.2%（年化约 2.4%）；retailAvg 取 +5% 并在 note 中说明是粗估 | 2020 货基收益明显低于 2015；散户平均收益无权威统计，如实标注
