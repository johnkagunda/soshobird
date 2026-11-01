-- ============================================================
-- SoshoBird — Add reply_to_id column to posts
-- Paste into Supabase SQL Editor → Run
-- ============================================================

-- Tracks which specific reply a post is responding to (null = direct reply to the original post)
alter table public.posts
  add column if not exists reply_to_id uuid references public.posts(id) on delete set null;
