-- ============================================================
-- SoshoBird — Add replies_count to posts + triggers
-- Paste into Supabase SQL Editor → Run
-- ============================================================

-- 1. Add the column (safe to re-run)
alter table public.posts
  add column if not exists replies_count integer default 0;

-- 2. Back-fill existing counts
update public.posts p
set replies_count = (
  select count(*) from public.posts r where r.parent_id = p.id
);

-- 3. Trigger function: increment on new reply
create or replace function public.handle_reply_insert()
returns trigger language plpgsql security definer as $$
begin
  if new.parent_id is not null then
    update public.posts set replies_count = replies_count + 1 where id = new.parent_id;
  end if;
  return new;
end;
$$;

-- 4. Trigger function: decrement on reply delete
create or replace function public.handle_reply_delete()
returns trigger language plpgsql security definer as $$
begin
  if old.parent_id is not null then
    update public.posts set replies_count = greatest(replies_count - 1, 0) where id = old.parent_id;
  end if;
  return old;
end;
$$;

-- 5. Attach triggers
drop trigger if exists on_reply_insert on public.posts;
create trigger on_reply_insert
  after insert on public.posts
  for each row execute procedure public.handle_reply_insert();

drop trigger if exists on_reply_delete on public.posts;
create trigger on_reply_delete
  after delete on public.posts
  for each row execute procedure public.handle_reply_delete();

-- 6. Also add reply_to_id if not already there (from previous migration)
alter table public.posts
  add column if not exists reply_to_id uuid references public.posts(id) on delete set null;
