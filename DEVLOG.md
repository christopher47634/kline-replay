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
