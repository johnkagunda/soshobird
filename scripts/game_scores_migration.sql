-- ============================================================
-- SoshoBird — Game Scores table
-- Paste into Supabase SQL Editor → Run
-- ============================================================

create table if not exists public.game_scores (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references public.profiles(id) on delete cascade not null,
  score      integer     not null default 0,
  created_at timestamptz default now()
);

alter table public.game_scores enable row level security;

-- Users can read all scores (for leaderboard)
drop policy if exists "game_scores_select" on public.game_scores;
create policy "game_scores_select" on public.game_scores
  for select using (true);

-- Users can only insert their own scores
drop policy if exists "game_scores_insert" on public.game_scores;
create policy "game_scores_insert" on public.game_scores
  for insert with check (auth.uid() = user_id);

-- Index for fast per-user best score lookup
create index if not exists game_scores_user_id_score_idx
  on public.game_scores(user_id, score desc);

-- Add best_game_score to profiles for quick access
alter table public.profiles
  add column if not exists best_game_score integer default 0;

-- RPC to safely update best_game_score only if higher
create or replace function public.update_best_game_score(p_user_id uuid, p_score integer)
returns void language plpgsql security definer as $$
begin
  update public.profiles
  set best_game_score = p_score
  where id = p_user_id
    and (best_game_score is null or best_game_score < p_score);
end;
$$;
