-- ============================================================
-- SoshoBird — Notifications table + triggers  (safe to re-run)
-- Paste into Supabase SQL Editor → Run
-- ============================================================

-- 1. Create notifications table
create table if not exists public.notifications (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references public.profiles(id) on delete cascade not null,
  actor_id   uuid        references public.profiles(id) on delete cascade not null,
  type       text        not null check (type in ('follow', 'post')),
  post_id    uuid        references public.posts(id) on delete cascade,
  read       boolean     default false,
  created_at timestamptz default now()
);

-- 2. RLS — users can only see / update their own notifications
--    The triggers run as security definer so they bypass RLS for INSERTs.
alter table public.notifications enable row level security;

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
  for update using (auth.uid() = user_id);

-- 3. Index for fast per-user ordering
create index if not exists notifications_user_id_created_at_idx
  on public.notifications(user_id, created_at desc);

-- 4. Enable Supabase Realtime on this table
--    replica identity full → Realtime can filter by column values
alter table public.notifications replica identity full;

do $$ begin
  -- Only add to publication if not already there (safe re-run)
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- 5. Trigger: create a 'follow' notification when someone follows a user
--    De-duplicates: only one follow notification per follower→following pair at a time.
create or replace function public.handle_follow_notification()
returns trigger language plpgsql security definer as $$
begin
  -- No self-follow notifications
  if new.follower_id = new.following_id then
    return new;
  end if;

  -- Avoid duplicate: delete any existing unread follow notification from same actor
  delete from public.notifications
  where user_id  = new.following_id
    and actor_id = new.follower_id
    and type     = 'follow'
    and read     = false;

  insert into public.notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');

  return new;
end;
$$;

drop trigger if exists on_follow_notification on public.follows;
create trigger on_follow_notification
  after insert on public.follows
  for each row execute procedure public.handle_follow_notification();

-- 6. Trigger: notify all followers when a user creates a top-level post
create or replace function public.handle_post_notification()
returns trigger language plpgsql security definer as $$
begin
  -- Replies don't trigger notifications
  if new.parent_id is not null then
    return new;
  end if;

  -- Insert one notification per follower of the post author
  insert into public.notifications (user_id, actor_id, type, post_id)
  select f.follower_id, new.user_id, 'post', new.id
  from public.follows f
  where f.following_id = new.user_id
    -- Don't notify the author themselves
    and f.follower_id <> new.user_id;

  return new;
end;
$$;

drop trigger if exists on_post_notification on public.posts;
create trigger on_post_notification
  after insert on public.posts
  for each row execute procedure public.handle_post_notification();

-- 7. Verification query — run this after applying to confirm everything is set up
-- SELECT
--   (SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='notifications') AS table_exists,
--   (SELECT count(*) FROM pg_trigger WHERE tgname='on_follow_notification') AS follow_trigger,
--   (SELECT count(*) FROM pg_trigger WHERE tgname='on_post_notification') AS post_trigger,
--   (SELECT count(*) FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications') AS realtime_enabled;
-- Expected: all four columns = 1
