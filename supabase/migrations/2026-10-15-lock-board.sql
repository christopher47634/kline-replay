-- 2026-10-15：锁定排行榜写入。在 Supabase SQL editor 里跑一次（可重复执行）。
-- 先在 Vercel 配好 SUPABASE_SERVICE_ROLE_KEY 再跑，否则线上提交会 503。

-- 1. 去掉公开 insert：拿到 anon key 也不能绕过 /api/board 直写任意 ret
drop policy if exists "public insert" on scores;

-- 2. 同一份结果（script_id + encoded）只保留最早的一条，再加唯一约束
delete from scores a
using scores b
where a.script_id = b.script_id
  and a.encoded = b.encoded
  and (a.created_at, a.id) > (b.created_at, b.id);

alter table scores drop constraint if exists scores_script_encoded_key;
alter table scores add constraint scores_script_encoded_key unique (script_id, encoded);
