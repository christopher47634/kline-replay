# 部署

## Vercel（推荐，一次导入，之后每次 push 自动部署）

1. 打开 https://vercel.com/new ，用 GitHub 登录，选择本仓库 `kline-replay` 点 Import。
2. Framework 会自动识别为 Next.js，不用改任何设置，直接 Deploy。`vercel.json` 已把区域设为香港（hkg1），国内访问更快。
3. 部署完成后，在 Vercel 项目 Settings → Environment Variables 里填：
   - `NEXT_PUBLIC_SITE_URL`：Vercel 给的域名，例如 `https://kline-replay.vercel.app`（分享链接和 OG 图用）
   - `NEXT_PUBLIC_REPO_URL`：`https://github.com/christopher47634/kline-replay`
   - 可选 `DEEPSEEK_API_KEY`（事后点评走 LLM）
   - 可选排行榜：`SUPABASE_URL` + `SUPABASE_ANON_KEY`（读榜）+ `SUPABASE_SERVICE_ROLE_KEY`（提交，只给服务端用，不要加 `NEXT_PUBLIC_` 前缀）。只配 anon key 时榜单只读，结果页不显示「上榜」，`POST /api/board` 返回 503。
4. 填完变量后在 Deployments 里 Redeploy 一次。

## 排行榜（Supabase）

1. 新建项目后在 SQL editor 跑 `supabase/schema.sql`（表只有公开读取策略，写入走 service role，并有 `(script_id, encoded)` 唯一约束）。
2. 已经按旧版建过表的：先在 Vercel 配好 `SUPABASE_SERVICE_ROLE_KEY` 并 Redeploy，再跑 `supabase/migrations/2026-10-15-lock-board.sql`（去掉公开 insert 策略、去重、加唯一约束）。顺序反了线上提交会 503。

## 本地

```bash
npm install
npm run build
npx next start   # http://localhost:3000
```
