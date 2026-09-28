-- Leaderboard table for /api/board. Run once in the Supabase SQL editor.
create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  script_id text not null,
  nickname text not null check (char_length(nickname) between 1 and 8),
  ret numeric not null,
  persona text not null,
  encoded text not null,
  created_at timestamptz not null default now()
);
create index if not exists scores_script_ret on scores (script_id, ret desc);
alter table scores enable row level security;
create policy "public read" on scores for select using (true);
create policy "public insert" on scores for insert with check (char_length(nickname) <= 8);
