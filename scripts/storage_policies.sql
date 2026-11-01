-- ============================================================
-- Storage RLS Policies
-- Paste this entire file into Supabase SQL Editor and Run
-- ============================================================

-- Drop existing policies first (safe to re-run)
drop policy if exists "avatars_select" on storage.objects;
drop policy if exists "avatars_insert" on storage.objects;
drop policy if exists "avatars_update" on storage.objects;
drop policy if exists "avatars_delete" on storage.objects;
drop policy if exists "media_select"   on storage.objects;
drop policy if exists "media_insert"   on storage.objects;
drop policy if exists "media_update"   on storage.objects;
drop policy if exists "media_delete"   on storage.objects;

-- AVATARS: anyone can view, authenticated users can upload/edit/delete
create policy "avatars_select"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "avatars_insert"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

create policy "avatars_update"
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

create policy "avatars_delete"
  on storage.objects for delete
  using ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- MEDIA: anyone can view, authenticated users can upload/edit/delete
create policy "media_select"
  on storage.objects for select
  using ( bucket_id = 'media' );

create policy "media_insert"
  on storage.objects for insert
  with check ( bucket_id = 'media' and auth.role() = 'authenticated' );

create policy "media_update"
  on storage.objects for update
  using ( bucket_id = 'media' and auth.role() = 'authenticated' );

create policy "media_delete"
  on storage.objects for delete
  using ( bucket_id = 'media' and auth.role() = 'authenticated' );
