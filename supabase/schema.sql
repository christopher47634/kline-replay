-- Leaderboard table for /api/board. Run once in the Supabase SQL editor.
-- 写入只走服务端（SUPABASE_SERVICE_ROLE_KEY，绕过 RLS），所以表上只有公开读取策略，没有 insert 策略。
-- 已经按旧版建过表的，请改跑 supabase/migrations/2026-10-15-lock-board.sql。
create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  script_id text not null,
  nickname text not null check (char_length(nickname) between 1 and 8),
  ret numeric not null,
  persona text not null,
  encoded text not null,
  created_at timestamptz not null default now(),
  constraint scores_script_encoded_key unique (script_id, encoded)
);
create index if not exists scores_script_ret on scores (script_id, ret desc);
alter table scores enable row level security;
drop policy if exists "public read" on scores;
create policy "public read" on scores for select using (true);
