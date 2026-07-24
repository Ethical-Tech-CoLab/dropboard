# DropBoard — Supabase backend

The BaaS backend from [../docs/PRODUCT_DESIGN.md](../docs/PRODUCT_DESIGN.md): Postgres +
Realtime + Storage + Edge Functions. This directory is deployable with the Supabase CLI.

```
supabase/
  config.toml
  migrations/       0001_schema · 0002_rls_grants · 0003_storage · 0004_cleanup
  functions/
    _shared/        http · jwt · admin · codes
    create-session/ join-session/ end-session/ cleanup/
```

## The security model in one paragraph

The browser holds only the **public anon key**. To act on a board it must present a
**short-lived JWT** minted by `create-session` / `join-session` after the access code is
validated. That JWT is signed with the project's JWT secret and carries a `session_id` claim
and `role: authenticated`. Every RLS policy (and Storage policy) scopes rows to
`auth.jwt() ->> 'session_id'`, so knowing one code never exposes another board. Session rows
are written only by Edge Functions using the service-role key. See migration `0002_rls_grants`.

## One-time setup

Prereqs: [Supabase CLI](https://supabase.com/docs/guides/cli), a Supabase project.

```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>

# 1. Apply schema + RLS + storage + cleanup helpers
supabase db push

# 2. Set the function secrets
#    JWT_SECRET must equal the project's JWT secret
#    (Dashboard > Project Settings > API > JWT Settings > JWT Secret) so the Supabase API
#    verifies our minted tokens. SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected.
supabase secrets set JWT_SECRET="<PROJECT_JWT_SECRET>"
supabase secrets set ALLOWED_ORIGIN="https://alx-du.github.io"   # lock CORS to the Pages origin

# 3. Deploy the functions
supabase functions deploy create-session
supabase functions deploy join-session
supabase functions deploy end-session
supabase functions deploy cleanup
```

Then put the project URL + anon key into [../web/config.js](../web/config.js).

## Endpoints

| Function | Auth | Purpose |
|---|---|---|
| `create-session` | public | Create a board; returns `access_code` + creator `session_token`. |
| `join-session` | public | Validate a code; returns a participant `session_token`. |
| `end-session` | creator `session_token` | Manually end a board. |
| `cleanup` | service-role key | Delete expired/ended sessions' storage + rows. |

Base URL: `https://<PROJECT_REF>.functions.supabase.co/<name>` (or
`${SUPABASE_URL}/functions/v1/<name>`).

### Quick smoke test

```bash
BASE="https://<PROJECT_REF>.functions.supabase.co"
# create
curl -sS -X POST "$BASE/create-session" -H "Content-Type: application/json" -d '{"ttl_hours":4}'
# join (use the access_code from above)
curl -sS -X POST "$BASE/join-session" -H "Content-Type: application/json" -d '{"access_code":"TIGER-4821"}'
```

## Scheduling cleanup (ephemerality)

`cleanup` deletes Storage objects **and** rows, so schedule it (not just the SQL helper). Using
`pg_cron` + `pg_net` with the service-role key stored in Supabase **Vault** (never in plaintext
SQL):

```sql
-- one-time: store the key in Vault
select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');

-- schedule every 15 minutes
select cron.schedule(
  'dropboard-cleanup', '*/15 * * * *',
  $$
  select net.http_post(
    url    := 'https://<PROJECT_REF>.functions.supabase.co/cleanup',
    headers:= jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body   := '{}'::jsonb
  );
  $$
);
```

Alternatively trigger `cleanup` from any external cron/GitHub Action that can hold the
service-role key as a secret.

## Notes / trade-offs

- **Token lifetime = session lifetime** (up to 24h). Long-lived tokens can't be revoked mid-
  session; acceptable for an ephemeral board, revisit if sessions get longer.
- **Rate limiting** on `create-session` / `join-session` is expected at the gateway/platform
  layer (§4.7) — the functions don't implement it themselves.
- The object-key convention is `\<session_id>/<uuid>-<filename>` (single level) so `cleanup`
  can list without recursion and Storage policies can match `(storage.foldername(name))[1]`.
