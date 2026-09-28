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
2026-09-28 | T04 | 头条草稿由编码 Agent（Claude）按 Prompt A 直接撰写，再按 4.4 审核清单自审，未调用 gen_headlines.py；脚本保留，配置 DEEPSEEK_API_KEY 后可重新生成草稿做对照 | 撰写者本身就是 LLM，省一轮外部调用；规格允许 Agent 自审；长度等硬约束由 validate_script.py 机检
2026-09-28 | T05 | 剧本 JSON 额外字段：months[].marketReturn（上证综指月收益）与 dataSources | 事后点评、人格判定 chaser 规则和结算页都需要大盘月收益
2026-09-28 | T05 | 计算 peakMonth=4（5 月末 4612 为全年月末最高），troughMonth=8（9 月末 3053） | 以脚本为准；附录 B 手算用例的 top_escaper 仍命中（6 月在 peak±1 内）
2026-09-28 | T06 | simulateDaily 的强平以月度 settle 为准：settle 判定强平的月份，在累计亏损首次触线的那天清零（没触线就在月末清零）；settle 没强平的月份日线不强平；每月初把资产重锚到 settle 的月末值 | 保证曲线和音乐永远不和游戏里显示的金额矛盾，路径误差不跨月累积
2026-09-28 | T08 | 人格卡"三个关键操作"：风险仓位 = 100 − 货币基金；最大加仓/减仓取风险仓位月变化的最大/最小值，最高风险月取「创业板 + 杠杆」最大的月 | 规格只给了名字没给口径
2026-09-28 | T09 | 编码 46 字节（45 数据 + 1 校验，校验混入 scriptId），自写 base64url 并要求尾部填充位为 0 | 否则改最后一个字符可能只改填充位而解码结果不变，篡改检测会漏
2026-09-28 | T09 | 爆仓提前结束的局，剩余月份编码为全现金；重放时账户归零即停止 | URL 长度固定，结算页照样能识别"爆仓结局"
2026-09-28 | T12 | "平均分配"= 上证50 20 / 创业板 15 / 银行 20 / 白酒 15 / 现金 15 / 杠杆 15 | 100 不能被 6 整除且步长为 5，低风险资产多分 5
2026-09-28 | T14 | 回合推进时 store 立刻结算并前进；结算对话框打开期间界面仍显示刚结算的那个月，关闭后才切到下月 | 满足"关闭对话框 → 进入下月"，同时刷新页面不会丢结算
2026-09-28 | T14 | 点评接口客户端预算 1.5 s，失败/超时在客户端也用同一份 comments.json 模板兜底 | 断网（连 /api/comment 都到不了）也能玩
2026-09-28 | T20 | OG 图走 /api/og?s=（next/og ImageResponse），中文字体按需向 Google Fonts 取子集；取不到时去掉中文只画数字和方块 | 本地无需打包 CJK 字体文件；/result 的 opengraph-image 约定拿不到 searchParams
2026-09-28 | T24 | 音画同步：Tone.Draw 回调里记录 `context.currentTime − 计划时间`，结果挂在 window.__klineMusic.sync()；lookAhead 调到 0.05 s | 规格要求记录误差；后台/隐藏标签页 rAF 被节流，测量要在前台标签页做
2026-09-28 | T29 | 排行榜用 Supabase anon key + RLS（只允许 select/insert），服务端用编码重算收益、不一致拒绝；建表 SQL 在 supabase/schema.sql | 规格要求防刷榜；无环境变量时 API 返回空、前端隐藏入口
2026-09-28 | T28 | 2020 货币基金取月 0.2%（年化约 2.4%）；retailAvg 取 +5% 并在 note 中说明是粗估 | 2020 货基收益明显低于 2015；散户平均收益无权威统计，如实标注
