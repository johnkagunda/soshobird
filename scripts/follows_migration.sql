-- ============================================================
-- FOLLOWS — run this entire file in Supabase SQL Editor
-- ============================================================

-- 1. Create follows table
create table if not exists public.follows (
  id           uuid        default gen_random_uuid() primary key,
  follower_id  uuid        references public.profiles(id) on delete cascade not null,
  following_id uuid        references public.profiles(id) on delete cascade not null,
  created_at   timestamptz default now(),
  unique (follower_id, following_id)
);

-- 2. RLS
alter table public.follows enable row level security;

drop policy if exists "follows_select" on public.follows;
drop policy if exists "follows_insert" on public.follows;
drop policy if exists "follows_delete" on public.follows;

create policy "follows_select" on public.follows for select using (true);
create policy "follows_insert" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete" on public.follows for delete using (auth.uid() = follower_id);

-- 3. Triggers to keep followers_count / following_count in sync
create or replace function public.handle_follow_insert()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
  update public.profiles set following_count = following_count + 1 where id = new.follower_id;
  return new;
end;
$$;

create or replace function public.handle_follow_delete()
returns trigger language plpgsql security definer as $$
begin
  update public.profiles set followers_count = greatest(followers_count - 1, 0) where id = old.following_id;
  update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
  return old;
end;
$$;

drop trigger if exists on_follow_insert on public.follows;
create trigger on_follow_insert
  after insert on public.follows
  for each row execute procedure public.handle_follow_insert();

drop trigger if exists on_follow_delete on public.follows;
create trigger on_follow_delete
  after delete on public.follows
  for each row execute procedure public.handle_follow_delete();

-- Done. Verify with:
-- select * from public.follows;
