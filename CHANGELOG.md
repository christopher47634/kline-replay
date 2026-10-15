# Changelog

格式参考 Keep a Changelog。更早的版本记录见 [DEVLOG.md](DEVLOG.md) 与 README 末尾的各版变更日志。

## [Unreleased]

### Added
- 结果页新增「本局复盘 + 累计战绩」：复盘由 `src/game/stats.ts` 的纯函数从结果码重新算出；累计战绩（局数、胜率、跑赢大盘比例、平均收益、最好/最差、爆仓与强平次数）只存在本机 localStorage，同一结果码只记一次，打开别人分享的链接不计入，可一键清空。
- `docs/REFERENCE_CASE.md`、`docs/reference-case-2015.json`、`scripts/reference_case.py`：用独立的 Python 手算固定 2015 + 附录 B 打法，`reference-case.test.ts` 逐月比对引擎并锁定强平边界。
- README 增加「数据真实性边界」一节；新增 `SECURITY.md`、本文件。
- 统计与参考案例的单元测试；e2e 完整一局中检查复盘与累计战绩出现。

### Changed
- CI 增加 Python 手算校验步骤（`scripts/reference_case.py --check`）。

## 2026-10-10
- 修复首页粒子图在偏好重渲染时进度丢失。

## 2026-10-09
- 深色专业盘口主题、稳定性修复、音乐高光入口等打磨（见 `docs/2026-10-09-*.md`）。

## 2026-10-02 及更早
- v4–v8、六个年份剧本、事件模式、盲盒模式、任务卡、挑战链接等，详见 DEVLOG.md。
