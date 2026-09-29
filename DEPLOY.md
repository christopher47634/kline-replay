# 部署

## Vercel（推荐，一次导入，之后每次 push 自动部署）

1. 打开 https://vercel.com/new ，用 GitHub 登录，选择本仓库 `kline-replay` 点 Import。
2. Framework 会自动识别为 Next.js，不用改任何设置，直接 Deploy。`vercel.json` 已把区域设为香港（hkg1），国内访问更快。
3. 部署完成后，在 Vercel 项目 Settings → Environment Variables 里填：
   - `NEXT_PUBLIC_SITE_URL`：Vercel 给的域名，例如 `https://kline-replay.vercel.app`（分享链接和 OG 图用）
   - `NEXT_PUBLIC_REPO_URL`：`https://github.com/christopher47634/kline-replay`
   - 可选 `DEEPSEEK_API_KEY`（事后点评走 LLM）、`SUPABASE_URL` + `SUPABASE_ANON_KEY`（排行榜）
4. 填完变量后在 Deployments 里 Redeploy 一次。

## 本地

```bash
npm install
npm run build
npx next start   # http://localhost:3000
```
