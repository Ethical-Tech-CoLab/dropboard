-- Ephemerality (docs/PRODUCT_DESIGN.md §4.5).
--
-- Two-part cleanup:
--   1. This DB-only helper marks/deletes expired session ROWS (items/participants cascade).
--      Safe to run from pg_cron with no secrets.
--   2. The `cleanup` Edge Function ALSO deletes the session's Storage objects (which SQL can't
--      reach) and then the rows. Schedule THAT for complete cleanup — see supabase/README.md.
--      Storage is not transactional with the DB, so the Edge Function deletes objects first,
--      then rows, and is safe to re-run.

-- Mark past-expiry sessions as 'expired' (idempotent).
create or replace function public.mark_expired_sessions()
returns integer
language sql
security definer
set search_path = public
as $$
  with updated as (
    update public.sessions
       set status = 'expired'
     where status = 'active' and expires_at < now()
    returning 1
  )
  select count(*)::int from updated;
$$;

-- Delete rows for sessions that are expired or ended (cascades to items/participants).
-- NOTE: orphans Storage objects if run without the Edge Function — prefer the Edge Function.
create or replace function public.delete_finished_sessions()
returns integer
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from public.sessions
     where expires_at < now() or status in ('ended', 'expired')
    returning 1
  )
  select count(*)::int from deleted;
$$;

-- Example pg_cron schedule for the DB-only marker (optional; storage cleanup still needs the
-- Edge Function). Requires the pg_cron extension.
--   select cron.schedule('mark-expired', '*/5 * * * *', $$ select public.mark_expired_sessions(); $$);
