-- Storage: one private bucket, path-namespaced per session (docs/PRODUCT_DESIGN.md §4.4).
--
-- Object key convention (single level under the session id so cleanup can list without
-- recursion):  <session_id>/<uuid>-<original_filename>
-- so (storage.foldername(name))[1] is always the session id.
--
-- Downloads are always via short-TTL signed URLs; the bucket is never public.

insert into storage.buckets (id, name, public)
values ('drops', 'drops', false)
on conflict (id) do nothing;

-- Upload: only into your own session's folder.
drop policy if exists "upload to my session folder" on storage.objects;
create policy "upload to my session folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'drops'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'session_id')
  );

-- Read (needed to mint a signed URL): only your own session's objects.
drop policy if exists "read my session objects" on storage.objects;
create policy "read my session objects" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'drops'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'session_id')
  );

-- Delete: only your own session's objects.
drop policy if exists "delete my session objects" on storage.objects;
create policy "delete my session objects" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'drops'
    and (storage.foldername(name))[1] = (auth.jwt() ->> 'session_id')
  );
