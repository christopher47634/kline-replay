# 穿越 K 线 · kline-replay

穿越回 2015 年，每月读真实事件改写的头条、分配虚拟仓位，12 回合后结算出投资人格卡，并把你这一年的资产曲线和大盘曲线演奏成一段二重奏。

1. **行情是真的**：每一回合的涨跌来自真实历史数据，每个选择都有真实后果。
2. **头条是"真事假写"**：AI 基于真实事件生成当年口吻的新闻，不剧透，玩家自己分辨信号与噪音。
3. **结果听得见**：你的资产曲线和大盘曲线被演奏成一段二重奏，和人格卡一起分享。

线上地址：**https://kline-replay.vercel.app**（部署步骤见 [DEPLOY.md](DEPLOY.md)） · 剧本：2015 疯牛与股灾、2020 疫情与核心资产 · 新玩法：大事件猜涨跌

![游戏回合](public/og/game-round.gif)
![结算与人格卡](public/og/persona-card.gif)
![音乐二重奏](public/og/music-duet.gif)

## 玩法

```mermaid
flowchart LR
  A[选剧本] --> B[开局 10 万虚拟资金]
  B --> C[读 3 条头条 + 1 条小道消息]
  C --> D[看走势（未来被遮住）]
  D --> E[分配 6 种资产]
  E --> F[用真实月收益结算<br/>盈亏 + 事后复盘 + 老股民点评]
  F -->|未满 12 个月| C
  F -->|12 个月 / 爆仓| G[结算页]
  G --> H[收益曲线 vs 满仓大盘 / 全程现金 / 散户平均]
  G --> I[段位 + 投资人格卡]
  G --> J[听听你的这一年]
  G --> K[复制结果 / 链接可复现]
```

- 每个回合的头条只写**回合开始时已经发生**的事（第 N 回合看的是上个月的新闻），结算后才揭晓本月复盘。
- 小道消息 12 条里 6 条暗示本月真实方向（说得像吹牛），6 条是纯噪音。
- 融资加杠杆 = 2 倍做多上证 50，年息 8.4%，当月亏 50% 强平归零。
- 结果链接 `/result?s=2015.xxxx` 只编码 12 个月的仓位（62 字符 + 校验字节），结算页每次都从链接重新计算，任何人打开看到的数字一致，篡改任意字符都会被识别为无效链接。

## 第二种玩法：大事件猜涨跌（`/events`）

3 分钟一局：从题库里随机抽 10 张历史事件卡（A 股经典时刻 23 张、全球黑天鹅 16 张，共 39 张已核实），每张给出事件日、背景和事发前 60 个交易日的真实走势，猜**事件日之后 20 个交易日是涨还是跌**。

- 计分：方向对 +10；进阶模式再猜幅度（<−10% / −10~−3% / ±3% / 3~10% / >10%），档对 +5；连对 3 张起每张再 +2。普通模式满分 116，进阶 166。
- 揭晓：曲线从事件日起逐日生长，20 个交易日对应 20 个音（涨为大调、跌为小调），再告诉你「当时发生了什么」。
- 结算：称号（市场先知 / 老江湖 / 有点感觉 / 随机漫步 / 反向指标）、每张卡的对错、战绩卡。战绩链接只有 30 个字符，结算页从链接重算，篡改会被识别。
- 题库在 [`content/events/`](content/events/) 里，只写文字；走势由 `content/data/prices/market_long.json`（上证综指 1990–）和 `spx_long.json`（标普 500 1927–）按日期切片。`python scripts/validate_events.py` 会检查日期是否交易日、前后数据是否齐全、文中引用的涨跌幅是否与行情一致、题库涨跌是否失衡。
- 20 个交易日涨跌幅不足 1% 的事件（答案接近平盘）不进题库，标记 `verify: false`。

## 历史时刻

主游戏里，剧本标记的关键日期（2015：1 月 19 日两融暴跌、6 月 12 日 5178 点、8 月 24 日黑色星期一；2020：2 月 3 日、7 月 6 日）会在**下一个回合开始前**插入一张全屏报纸风卡片，选项只是预填本月仓位（减半仓 / 不动 / 加杠杆），之后仍可自由调整，不改变结算规则，所以结果链接的复现不受影响。

## 数据来源与免责声明

| 资产 | 序列 | 实际数据源（2015 / 2020） |
|---|---|---|
| 上证50 ETF | 510050 前复权 | akshare `fund_etf_hist_em`（东方财富） |
| 创业板 ETF | 159915 前复权 | akshare `fund_etf_hist_em`（东方财富） |
| 银行板块 | 中证银行 399986 | akshare `stock_zh_index_hist_csindex`（中证指数官网，东方财富接口不通时的备选） |
| 白酒板块 | 中证白酒 399997 | akshare `stock_zh_index_hist_csindex`（同上） |
| 大盘基准 | 上证综指 000001 | akshare `stock_zh_index_daily`（新浪，备选） |
| 货币基金 | — | 固定月收益：2015 年 0.3%，2020 年 0.2% |
| 事件模式：上证综指全量 | 000001 | akshare `stock_zh_index_daily`（新浪），1990-12 至今 |
| 事件模式：标普 500 全量 | ^GSPC | Yahoo Finance chart 公开接口（1927 至今；akshare 新浪源只有 2004 年起，作为备选） |

每个文件的来源、行数、首末日期、是否启用备选都记录在 [`content/data/manifest.json`](content/data/manifest.json)。2015 年上证综指逐月收益与规格附录 B 的参考值全部吻合。

散户平均收益：2015 年取 −25%（公开研究估算的 −20%～−30% 区间中值）；2020 年缺少权威统计，粗估取 +5%，页面上有注明。

事件时间线参考维基百科等公开资料，见 [`scripts/timelines/`](scripts/timelines/)。

> 本游戏全部使用虚拟资金，仅用于娱乐和了解历史。历史行情不代表未来表现，游戏内的头条、小道消息、点评和人格评语都不构成任何投资建议。

## 人格判定规则

从上到下依次判定，命中即停。`highRisk = 创业板 + 融资杠杆`，`peakMonth / troughMonth` 是上证综指月末收盘最高 / 最低的月份（2015 为 5 月 / 9 月）。

| 人格 | 规则 |
|---|---|
| 🎢 杠杆狂人 | 融资加杠杆 ≥ 30% 的月份 ≥ 4 个 |
| 🪂 逃顶大师 | peakMonth ± 1 内某月 highRisk ≤ 20，且前一月 ≥ 40 |
| 🎯 抄底猎人 | troughMonth 当月或下月 highRisk 比前一月增加 ≥ 30 |
| 🏄 追涨型冒险家 | 大盘连涨 2 个月后的下一月 highRisk 增加 ≥ 20，出现 ≥ 2 次 |
| 🐦 惊弓之鸟 | 某月亏损后下一月货币基金 ≥ 60%，出现 ≥ 2 次 |
| 💎 钻石手 | 每月换手幅度 Σ\|Δ\|/2 都 ≤ 10 |
| 🌊 随波逐流者 | 默认 |

## 音乐映射规则

| 元素 | 数据 | 规则 |
|---|---|---|
| 主旋律 | 你的日度资产曲线 | 每个交易日一个音，Tone.js `PolySynth` 三角波 |
| 音阶 | 全年终值 | 赚钱 C 大调五声 C3–A5，亏钱 A 小调五声 A2–G5 |
| 音高 | 累计收益 d | d ∈ [−50%, +50%] → 音阶索引 [0, 14]；单日 > +3% 升一级，< −3% 降一级 |
| 力度 | 单日收益 | \|r\| ∈ [0, 5%] → [0.4, 1.0] |
| 低音 | 上证综指 | `MonoSynth`，每 5 个交易日一个音，低两个八度 |
| 镲 | 换仓 / 跑赢跑输切换 | 换仓月首日 0.6；你和大盘曲线交叉 0.4 |
| 低鼓 | 大跌 / 强平 | 单日 ≤ −5% 一声；强平日 C1 三连击 + 画面闪红 |
| 装饰音 | 大涨 | 单日 ≥ +5% 加高八度 |
| 速度 | — | 每音 0.2 s，约 49 s 一年，可切 2x |

画面是 16:9 Canvas：红线是你、灰线是大盘，从左向右生长；每个音一个涟漪，月份虚线、换仓标记、底部 30 格钢琴卷帘，播完定格"你的 2015 · 跑赢大盘 X 个百分点"。

## 技术栈与架构

Next.js 15（App Router）· React 19 · TypeScript · Tailwind CSS v4 · Zustand（persist 到 localStorage）· Recharts · Tone.js 15 · html-to-image · Supabase（可选）· DeepSeek（可选）· Vitest · Playwright · Python + akshare（仅开发期数据管线）

```mermaid
flowchart TB
  subgraph dev[开发期 · scripts/]
    F[fetch_prices.py<br/>akshare 多源回退] --> P[(content/data/prices)]
    T[timelines/*.md] --> G[gen_headlines.py / 人工撰写] --> H[*.headlines.json 审核版]
    P & H --> B[build_script.py] --> S[(content/scripts/2015.json)]
    B --> V[validate_script.py]
  end
  subgraph run[运行期 · src/]
    S --> E[game/engine.ts<br/>settle · simulateDaily · benchmarks · rank]
    E --> PS[game/persona.ts]
    E --> ST[game/store.ts] --> UI[/play/[script]/]
    E --> EN[game/encode.ts] --> R[/result?s=/]
    E --> M[music/compose → player(Tone) → visual(Canvas)]
    R --> OG[/api/og]
    UI --> CM[/api/comment<br/>DeepSeek 1.5s，超时走模板]
    R --> BD[/api/board<br/>Supabase，服务端重算]
  end
```

运行时只读仓库里的 JSON，不依赖外部接口；点评和排行榜都有兜底，环境变量全空也能完整玩一局。

## 本地运行

```bash
npm install
npm run dev          # http://localhost:3000
```

可选环境变量见 [`.env.example`](.env.example)：`DEEPSEEK_API_KEY`（事后点评走 LLM，缺省用模板）、`SUPABASE_URL` + `SUPABASE_ANON_KEY`（排行榜，建表 SQL 在 [`supabase/schema.sql`](supabase/schema.sql)）。

检查命令：

```bash
npm run lint
npm run test         # Vitest：引擎 / 人格 / 编码 / 作曲 / 事件模式 / 历史时刻
npm run build
npm run e2e          # Playwright：完整一局 + 分享 + 音乐 + 历史时刻 + 事件模式；本机用系统 Chrome，CI 用 /opt/pw-browsers/chromium（可用 PW_CHROMIUM 覆盖）
npm run cli          # 命令行按附录 B 固定操作跑一局
```

重建数据（可选，仓库已带好数据）：

```bash
python -m venv .venv && .venv/Scripts/pip install -r scripts/requirements.txt   # macOS/Linux 用 .venv/bin/pip
.venv/Scripts/python scripts/fetch_prices.py 2015 2020
.venv/Scripts/python scripts/build_script.py 2015
.venv/Scripts/python scripts/build_script.py 2020
```

## AI 工具使用说明

- **AI 生成的代码**：数据管线（fetch / build / validate / gen_headlines）、游戏引擎与测试、人格判定、URL 编码、全部页面与组件、音乐作曲 / 调度 / 可视化、API 路由、e2e 用例——由 Claude Code（Claude Opus）按规格书逐任务生成。
- **AI 生成的内容**：2015 / 2020 共 24 个月的头条、小道消息、事后复盘；7 种人格的称号与评语；12 类 × 4 条事后点评模板。运行时的事后点评在配置了 DeepSeek 时由 LLM 实时生成。
- **人（与规则）做了什么**：规格书与玩法设计；事件时间线核对；头条按审核清单（不剧透、无人名、无点位预测、无买卖建议、字数上限）把关，字数与结构由 `validate_script.py` 机检；所有行情数字只来自数据脚本，不手写。
- 开发过程的每一步决策见 [`DECISIONS.md`](DECISIONS.md)，日志见 [`DEVLOG.md`](DEVLOG.md)。

## 后续计划

- 第三个剧本（2007 大牛市）
- 音乐导出视频
- 双人对战：同一剧本、同一时间线、实时比收益
- 更多想法见 [`IDEAS.md`](IDEAS.md)

## v2 变更日志（2026-09-29）

- 修复：音乐播放时的 Tone.js 异常；定格文案与换仓标签重叠；GitHub 链接改读环境变量。
- 游戏页：第 1 回合走势图带开局前两个月；头条卡有语气色条、虚构媒体、日期戳和「头条」标签，顶部有上月市场温度计；新增「本月已知信息」卡；手机端紧凑状态栏；资产说明「?」；输入框内 Enter 提交。
- 结算页：图例「你」排第一；散户平均改为端点标注；tooltip 显示当月仓位；强平月标记；关键操作文案改人话；音乐链接 `?play=1`。
- 音乐：竖屏 9:16 画面；全站静音开关（记住选择）；强平局 2x 播放 0 错误。
- OG 图：中文字体子集随仓库打包，断网也出中文。
- 新增：大事件猜涨跌模式、历史时刻插卡、三段 GIF、演示视频原始素材脚本（`scripts/record_demo.mjs`）。

## v3 前端包装（2026-09-29）

设计概念「深夜盘口 · 档案馆」：冷的终端（等宽数字、K 线、红绿光）× 暖的档案（报纸、纸张、打字机）。规则、数据和链接编码没有改。

![首页 hero](docs/screenshots/v3/home-hero-6s.png)
![结算对话框](docs/screenshots/v3/desktop-settle-dialog.png)
![结算页人格卡](docs/screenshots/v3/desktop-result-persona.png)

- **首页**：2015 年 244 根上证日 K 变成粒子，飞入成走势轮廓，鼠标会推开粒子；5178 翻牌与飞入同时结束；三段滚动叙事；剧本卡倾斜、卡片转场；跑马灯。低端设备 / 减弱动效 / 无 WebGL 时自动换成静态图。
- **游戏**：纸色档案 Intro、翻页进入；阻尼滑块每跨一档有 tick 与震动；「结算中…」→ 月份翻牌 → 结算对话框从按钮放大，盈亏数字翻牌落定；强平有整页震动、红暗角、信号干扰和低鼓。
- **结算**：翻牌收益、段位盖章、四条线依次绘制、人格卡 3D 翻转；音乐弹窗背景随音符发光。
- **声音**：6 个 UI 音效共 12 KB，首次访问有「开启声音」提示；右上角喇叭可关，同一音效 80 ms 内不重复。
- **降级**：`prefers-reduced-motion`、省电模式、触屏、无 WebGL、页面不可见各有测试（`e2e/degrade.spec.ts`）。

新增命令：

```bash
npm run perf                          # Lighthouse：首页 / 游戏 / 结算 × 桌面 / 手机（4G），对照方案 7.1 预算
node scripts/analyze_trace.mjs        # 4 倍降速下的帧耗时统计
node scripts/record_showreel.mjs      # 录展示视频（需要 Playwright 自带 ffmpeg）
python scripts/build_fonts.py         # 重新生成得意黑子集
node scripts/render_sfx.mjs           # 重新合成 6 个音效
```
