# Security Policy

## 报告漏洞

请不要在公开 issue 里贴漏洞细节。通过 GitHub 的 **Security → Report a vulnerability**（私有安全公告）联系仓库所有者 christopher47634；没有开通时再开一个只写「想报告安全问题」的 issue，等待联系方式。个人维护的项目，通常数日内回复，不提供赏金。

## 范围

- 在线站点 https://kline-replay.vercel.app 及本仓库代码。
- 结果链接 `/result?s=...` 的解码与校验、`/api/board`、`/api/comment`、`/api/og` 三个接口。

## 数据与密钥

- 游戏全部使用虚拟资金，不收集账号、支付或个人身份信息。存档与累计战绩只在浏览器 localStorage。
- 所有密钥（`DEEPSEEK_API_KEY`、`SUPABASE_*`）都是可选环境变量，只放在 Vercel / 本地 `.env`，**不提交进仓库**（见 `.env.example`，其中无真实值）。缺失时功能降级（模板点评、隐藏排行榜）。
- 排行榜写入服务端校验结果码的校验字节并重算收益，不信任客户端上报的数字。

## 支持的版本

只维护 `main` 分支和线上最新部署。
