-- DropBoard schema — sessions, items, participants.
-- See docs/PRODUCT_DESIGN.md §4.1. Postgres 15 (Supabase) has gen_random_uuid() built in.

create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  access_code  text unique not null,             -- human-readable, e.g. TIGER-4821
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,             -- timer-based end
  ended_at     timestamptz,                       -- set when ended manually
  status       text not null default 'active'
    check (status in ('active', 'ended', 'expired'))
);

create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  kind        text not null check (kind in ('file', 'link', 'text')),
  content     jsonb not null,                     -- {text} | {url,title,favicon} | {name,size,path}
  created_at  timestamptz not null default now(),
  created_by  text                                -- optional display name (attribution)
);

create table if not exists public.participants (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  display_name text,
  joined_at    timestamptz not null default now()
);

create index if not exists items_session_created_idx
  on public.items (session_id, created_at);
create index if not exists participants_session_idx
  on public.participants (session_id);
