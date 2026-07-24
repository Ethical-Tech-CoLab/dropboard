-- Row Level Security — the security boundary (docs/PRODUCT_DESIGN.md §4.2).
--
-- The browser holds only the PUBLIC anon key. Real access is gated by a short-lived JWT that
-- an Edge Function mints after validating the access code. That JWT carries a `session_id`
-- claim and `role: authenticated`, so PostgREST/Realtime/Storage run as the `authenticated`
-- role and every policy below scopes rows to `auth.jwt() ->> 'session_id'`.
--
-- Rows are INSERTed into sessions and UPDATEd (end) only by Edge Functions using the
-- service_role key, which bypasses RLS — so there are no anon/authenticated write policies on
-- sessions.

-- Table privileges (RLS still restricts WHICH rows are visible/writable).
grant usage on schema public to anon, authenticated;
grant select, insert, delete on public.items to authenticated;
grant select, insert on public.participants to authenticated;
grant select on public.sessions to authenticated;

alter table public.sessions     enable row level security;
alter table public.items        enable row level security;
alter table public.participants enable row level security;

-- Helper: the session_id carried by the caller's JWT (null for anon/no claim).
create or replace function public.jwt_session_id()
returns uuid
language sql stable
as $$
  select nullif(auth.jwt() ->> 'session_id', '')::uuid;
$$;

-- sessions: a participant may read only their own session row.
drop policy if exists "read own session" on public.sessions;
create policy "read own session" on public.sessions
  for select using (id = public.jwt_session_id());

-- items: read/insert/delete scoped to the caller's session.
drop policy if exists "read items in my session" on public.items;
create policy "read items in my session" on public.items
  for select using (session_id = public.jwt_session_id());

drop policy if exists "insert items in my session" on public.items;
create policy "insert items in my session" on public.items
  for insert with check (session_id = public.jwt_session_id());

drop policy if exists "delete items in my session" on public.items;
create policy "delete items in my session" on public.items
  for delete using (session_id = public.jwt_session_id());

-- participants: read/insert scoped to the caller's session.
drop policy if exists "read participants in my session" on public.participants;
create policy "read participants in my session" on public.participants
  for select using (session_id = public.jwt_session_id());

drop policy if exists "insert participants in my session" on public.participants;
create policy "insert participants in my session" on public.participants
  for insert with check (session_id = public.jwt_session_id());
