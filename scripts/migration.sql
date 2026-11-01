-- ============================================================
-- SoshoBird App — Full Migration (safe to re-run)
-- Paste entire file into Supabase SQL Editor → Run
-- ============================================================

-- 1. Drop everything and start clean
drop trigger if exists on_auth_user_created on auth.users;

-- Drop likes triggers safely (table may not exist yet)
do $$ begin
  drop trigger if exists on_like_insert on public.likes;
  drop trigger if exists on_like_delete on public.likes;
exception when undefined_table then null;
end $$;

drop function if exists public.handle_new_user();
drop function if exists public.handle_like_insert();
drop function if exists public.handle_like_delete();
drop function if exists public.increment_reposts(uuid);
drop function if exists public.increment_likes(uuid);
drop function if exists public.decrement_likes(uuid);

drop table if exists public.likes     cascade;
drop table if exists public.votes     cascade;
drop table if exists public.comments  cascade;
drop table if exists public.post_views cascade;
drop table if exists public.user_roles cascade;
drop table if exists public.posts     cascade;
drop table if exists public.profiles  cascade;

-- 2. Profiles
create table public.profiles (
  id               uuid        references auth.users(id) on delete cascade primary key,
  username         text        unique,
  full_name        text,
  avatar_url       text,
  bio              text,
  location         text,
  website          text,
  is_verified      boolean     default false,
  followers_count  integer     default 0,
  following_count  integer     default 0,
  push_token       text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- 3. Posts
create table public.posts (
  id            uuid        default gen_random_uuid() primary key,
  user_id       uuid        references public.profiles(id) on delete cascade not null,
  content       text,
  images        text[],
  parent_id     uuid        references public.posts(id) on delete cascade,
  likes_count   integer     default 0,
  reposts_count integer     default 0,
  created_at    timestamptz default now()
);

-- 4. Likes (junction table — one row per user+post, prevents double-likes)
create table public.likes (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references public.profiles(id) on delete cascade not null,
  post_id    uuid        references public.posts(id)    on delete cascade not null,
  created_at timestamptz default now(),
  unique (user_id, post_id)
);

-- 5. Row Level Security
alter table public.profiles enable row level security;
alter table public.posts    enable row level security;
alter table public.likes    enable row level security;

-- profiles
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- posts
create policy "posts_select" on public.posts for select using (true);
create policy "posts_insert" on public.posts for insert with check (auth.uid() = user_id);
create policy "posts_update" on public.posts for update using (auth.uid() = user_id);
create policy "posts_delete" on public.posts for delete using (auth.uid() = user_id);

-- likes
create policy "likes_select" on public.likes for select using (true);
create policy "likes_insert" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete" on public.likes for delete using (auth.uid() = user_id);

-- 6. Auto-increment / decrement likes_count via triggers
create or replace function public.handle_like_insert()
returns trigger language plpgsql security definer as $$
begin
  update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  return new;
end;
$$;

create or replace function public.handle_like_delete()
returns trigger language plpgsql security definer as $$
begin
  update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

create trigger on_like_insert
  after insert on public.likes
  for each row execute procedure public.handle_like_insert();

create trigger on_like_delete
  after delete on public.likes
  for each row execute procedure public.handle_like_delete();

-- 7. Reposts RPC
create or replace function public.increment_reposts(post_id uuid)
returns void language sql security definer as $$
  update public.posts set reposts_count = reposts_count + 1 where id = post_id;
$$;

-- 8. Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'username'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Done. Also create these two Storage buckets manually:
--   Supabase Dashboard → Storage → New bucket
--   • avatars  (public)
--   • media    (public)
-- ============================================================

-- ============================================================
-- Follows table
-- ============================================================

create table if not exists public.follows (
  id          uuid        default gen_random_uuid() primary key,
  follower_id uuid        references public.profiles(id) on delete cascade not null,
  following_id uuid       references public.profiles(id) on delete cascade not null,
  created_at  timestamptz default now(),
  unique (follower_id, following_id)
);

alter table public.follows enable row level security;
create policy "follows_select" on public.follows for select using (true);
create policy "follows_insert" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete" on public.follows for delete using (auth.uid() = follower_id);

-- Auto-update follower/following counts
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

-- ============================================================
-- Reposts junction table (prevents duplicate reposts)
-- Run in Supabase SQL Editor
-- ============================================================

create table if not exists public.reposts (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references public.profiles(id) on delete cascade not null,
  post_id    uuid        references public.posts(id)    on delete cascade not null,
  created_at timestamptz default now(),
  unique (user_id, post_id)
);

alter table public.reposts enable row level security;
create policy "reposts_select" on public.reposts for select using (true);
create policy "reposts_insert" on public.reposts for insert with check (auth.uid() = user_id);
create policy "reposts_delete" on public.reposts for delete using (auth.uid() = user_id);

-- Keep reposts_count in sync via triggers
create or replace function public.handle_repost_insert()
returns trigger language plpgsql security definer as $$
begin
  update public.posts set reposts_count = reposts_count + 1 where id = new.post_id;
  return new;
end;
$$;

create or replace function public.handle_repost_delete()
returns trigger language plpgsql security definer as $$
begin
  update public.posts set reposts_count = greatest(reposts_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists on_repost_insert on public.reposts;
create trigger on_repost_insert
  after insert on public.reposts
  for each row execute procedure public.handle_repost_insert();

drop trigger if exists on_repost_delete on public.reposts;
create trigger on_repost_delete
  after delete on public.reposts
  for each row execute procedure public.handle_repost_delete();

-- Drop old RPC (triggers handle it now)
drop function if exists public.increment_reposts(uuid);
