# DEVLOG（AI 开发日志）

## 2026-09-28

**做了什么**：T01–T05。初始化 Next.js 15 + Tailwind v4 仓库；写 fetch_prices.py 拉取 2015/2020 两年 5 个行情序列（带多源回退与重试、manifest）；整理 2015/2020 事件时间线；撰写并审核 24 个月的头条/小道消息/复盘；build_script.py 算月收益与日线切片，validate_script.py 通过，上证月收益与附录 B 逐月吻合。

**AI 生成的模块**：数据管线三个脚本、两年时间线与全部头条文案（Claude 按 Prompt A 撰写、按审核清单自审）。

**遇到的问题**：东方财富指数接口在本机网络下断连 → 改走中证指数官网和新浪，见 BLOCKERS.md。第 N 回合头条若写当月事件会剧透结算，改为"回合开始时已知信息"视角，见 DECISIONS.md。

### 下午：引擎、界面、结算、音乐

**做了什么**：
- T06–T09 + C1：引擎（settle / simulateDaily / benchmarks / rank）、人格判定、URL 编码。Vitest 28 条全绿；`npm run cli` 按附录 B 跑出 ¥174,293（+74.3%，传奇操盘手，逃顶大师），与 Python 独立手算逐月一致。
- T10–T15：Zustand 持久化的游戏状态；状态栏数字滚动、头条卡、股吧老哥卡（自绘 SVG 头像）、分配面板（滑块/数字输入/合计校验/三个快捷键/杠杆警示/移动端五档按钮 ±5）、走势图（未来区斜纹遮罩）、结算对话框（各资产贡献、复盘、点评骨架 + 1.5 s 超时兜底、强平红框）、开场打字机、首页（继续上次）。在浏览器里实际玩了回合，结算与对话框正常。
- T16–T21：结算页从 URL 解码重算；四线收益图 + 三句对比；人格卡与 1080×1350 海报导出；Wordle 方块；分享栏；/api/og 动态预览图（中文字体按需子集，已本地验证出图）；/about；404。
- T22–T26：作曲（compose，4+2 条测试）、Tone.js 播放器（play/pause/stop/seek/1x2x/dispose）、Canvas 可视化（生长双线、涟漪、月份虚线、换仓标记、钢琴卷帘、定格文案）、全屏 MusicModal。浏览器里点播放后进度正常前进、无报错。
- T27 / T29：事后点评接口（本机环境有 DeepSeek Key，实测返回 LLM 点评；无 Key 或超时走 comments.json）；排行榜接口 + 上榜 + /board 页，无 Supabase 变量时隐藏且不报错。
- T28：2020 剧本数据与头条一并完成，validate 通过。

**AI 生成的模块**：以上全部代码、人格评语、点评模板。

**遇到的问题**：
- 桌面端内嵌浏览器面板隐藏时 rAF 被节流，音画同步只采到 6 个样本、约 160 ms，不能代表前台表现。改用 Playwright 驱动前台 Chrome 完整播放一遍：244 个音全部采样，Draw 回调与音频时钟误差最大 0.7 ms（规格要求 < 50 ms）。
- 结算页整页有 fade-in 动画（transform），把音乐弹窗的 position: fixed 困在页面里、没铺满屏幕 → 弹窗改为 portal 到 body，画布尺寸按容器内边距重新计算。
- `npm run build` 和 `next dev` 共用 .next，边开 dev 边 build 会把 dev 弄坏，之后本地预览统一用 `next start`。
- vitest 5 与 @types/node 20 peer 冲突，升到 @types/node 24。
- Playwright：本机没有 /opt/pw-browsers/chromium，配置里自动回退到系统 Chrome（`channel: "chrome"`），可用 `PW_CHROMIUM` 覆盖。

**验证结果**：lint 通过；Vitest 28/28；Playwright e2e 2/2（完整一局 → 结算 → 复制链接新页面数字一致 → 音乐播放进度前进；无效链接错误态）；两个剧本 validate 通过；375px 下游戏页与结算页无横向滚动。

**未做 / 需要人来做**：C2/C3/C4/C5 的 Vercel 部署（需要账号授权）、5 人试玩与 3 局盲听、iOS/Android 真机、Demo 视频与 GIF 录制（T33–T35）。

## 2026-09-29：v2 改进（V01–V30）

**做了什么**：
- **修 bug**：音乐 `Start time must be strictly greater` 异常（kick 三实例、镲声去重、try/catch，e2e 断言 pageerror=0；强平局 2x 播放 0 错误）；定格文案与换仓标签重叠；首页 GitHub 链接改读环境变量。
- **前端打磨**：剧本加 preMonths，走势图第 1 回合有上下文；头条卡改版（tone 色条 / 虚构媒体 / 日期戳 / 头条标签 / 市场温度计）；「本月已知信息」卡和中列布局；手机 44px 紧凑状态栏；资产「?」说明、按钮禁用文案、输入框里 Enter 提交；结算图图例重排与散户平均端点标注、仓位 tooltip、强平标记；关键操作改人话；音乐弹窗竖屏 9:16；全站静音开关；音乐链接 `?play=1`；OG 中文字体子集打包（断网也出中文）。
- **新模式「大事件猜涨跌」**：`fetch_long.py` 拉上证 1990– 与标普 1927–；39 张事件卡；`validate_events.py` 用行情核对文中数字并统计涨跌比例；事件引擎 + 22 字节链接；`/events`、游戏页（逐日生长 + 20 音）、结算页与战绩卡。
- **历史时刻插卡**：2015 三张、2020 两张，effect 只预填仓位。
- **材料**：三段 GIF（public/og/）、`record_demo.mjs` 录出 2 分 51 秒原始视频与分镜表（demo/）。

**AI 生成的模块**：以上全部。

**遇到的问题**：
- OG 路由：`next start` 在不同工作目录下启动时 `process.cwd()` 不是项目根，字体读不到；webpack 会把 `new URL(..., import.meta.url)` 换成资源 URL，不能直接 fileURLToPath。最终用 cwd → `__dirname` 两处回退。
- Yahoo 接口在 Windows 上负时间戳（1987 年以前）`datetime.fromtimestamp` 报 Invalid argument，改用 epoch 加 timedelta。
- 结算页 `?play=1` 时服务端渲染会碰到 `document`（portal），改成挂载后才渲染弹窗。
- Playwright 录像需要它自带的 ffmpeg：装到 E 盘（PLAYWRIGHT_BROWSERS_PATH），不写 C 盘。
- 心得：题库文本里的数字容易和行情对不上（例如 1987 年黑色星期一写了道指的 22.6%，行情是标普的 20.5%）；validate_events.py 的正则对照当场抓到。

**验证结果**：lint 通过；Vitest 48 条；Playwright 6 条（主游戏、历史时刻、事件模式一局/进阶/篡改链接）；两个剧本 validate 通过；事件题库 validate 通过。

**未做 / 需要人来做**：Vercel 部署（需要账号授权）；配旁白剪辑 demo 视频；5 人试玩与 3 局盲听；iOS/Android 真机；题库逐条对照交易所公告 / 维基百科的人工复核。

## 2026-09-29：v3 前端包装

**做了什么**：F01–F25。F01–F06 按任务提交；F07–F20 是在命令行故障期间连同其后的性能整改一起完成的，事后按区域拆成 7 个提交合入 main（首页 / Intro / 游戏 / 结算 / 音乐 / 事件 + 共享），每个提交对应的截图在 `docs/screenshots/v3/`。

**命令行故障（诚实记录）**：写 F13（进入下个月）起，命令行工具被服务端的自动审批服务连续拒绝（返回「没有给出判定」，不是命令本身的问题），最终连续 10 次后当前回合被强制结束。这段时间里 **F13 后半到 F20 的代码是在没有任何编译、类型检查、测试反馈的情况下写的**（GameView、StatusBar、SettleDialog、BustFx、ResultView、PersonaCard、BlockGrid、ReturnChart、MusicModal、EventGame、Odometer）。恢复后先原样提交到 wip 分支，再依次 tsc / lint / vitest / build / e2e：tsc、lint、Vitest 一次通过，e2e 只有一处失败（减弱动效下首页仍有 canvas），已修。

**性能**：第一次测量首页手机 56、桌面 82，LCP 12 s。原因：Tailwind 扫描了整个仓库（CSS 126 KB）、Noto 中文切片、GSAP / Lenis / motion / recharts 都在首屏。处理后（`npm run perf`，手机为 4G 档）：

| 页面 | 桌面 性能 / LCP | 手机 性能 / LCP |
|---|---|---|
| 首页 | 97 / 1.2 s | 98 / 1.8 s |
| 游戏（Intro） | 99 / 0.6 s | 87 / 1.3 s |
| 结算 | 99 / 0.9 s | 94 / 1.6 s |

无障碍 95–100，CLS ≤ 0.004。首屏 JS（gzip，含共享 103 KB）：首页 176 KB、游戏 203 KB、结算 200 KB。帧耗时（4 倍降速，`scripts/analyze_trace.mjs`）：首页桌面滚动 p95 16.7 ms、手机 8.4 ms；结算对话框弹出时最初平均 44 fps（预算 45）；验收后把图表新增段推迟到对话框关闭后再画，三次测量平均 57 fps（p95 33–37 ms），达标。均在无 GPU 的无头 Chrome 上量的，真机未测。

**第 6 节微交互清单核对**

| 项 | 状态 |
|---|---|
| 主按钮磁吸 / 按下 0.96 / tick / 10 ms 震动 | ✓ |
| 次按钮、卡片 hover、卡片进入视口 stagger | ✓ |
| 数字翻牌（结算、首页 5178、对比句、对话框） | ✓ |
| 滑块阻尼、跨档 tick + 震动、轨道色随风险 | ✓ |
| 对话框从触发按钮放大 / 缩回；出现时 flip 音效 | ✓（玻璃模糊在 ::backdrop 上） |
| Toast 滑入 | ✓ |
| 走势线新增 | ✓ 整条重绘 0.4 s，未做「只画新增一段」 |
| 标题 SplitText 揭示 | ✓ |
| 强平：震动 + 红暗角 + RGB 错位 + bust + 长震动 | ✓ 已在 `/dev/motion` 验证（2015、2020 的数据里没有月份跌到强平，无法在真实对局里触发） |
| 段位盖章、方块弹入、人格卡翻转 | ✓ |
| 事件卡猜对 / 猜错反馈 | ✓ 猜对 +N 在原位弹出，**没有做上飘消失**；**连对火焰粒子没有做** |
| 路由转场 | ✓ 只有入场，见 DECISIONS |
| 光标 | ✓ |
| 手机拖拽猜涨跌（阈值 80 px） | ✓ 代码完成，未在真机上试 |
| 排行榜前三色条、行 stagger | ✓；「自己的记录高亮脉冲」没做（榜单页是服务端渲染，不知道谁是自己） |

**未做 / 待做**：音乐弹窗的 R3F 背景（CSS 版已做）；上面标注的几项；展示视频只有 51 秒（方案要 40 秒），原始素材 `demo/showreel.webm`，剪辑版 `demo/showreel-40s.mp4`；真机与 iOS 未测。
