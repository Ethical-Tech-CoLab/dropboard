# DropBoard — Cloudflare backend (alternative to Supabase)

An alternative backend on **Cloudflare Workers + Durable Objects + R2**, evaluated in
[../docs/BACKEND_OPTIONS.md](../docs/BACKEND_OPTIONS.md). It shares a platform with the
[`pages-ai-proxy`](https://github.com/Ethical-Tech-CoLab/pages-ai-proxy) (whose quickest deploy
is also Cloudflare Workers), so there's no separate BaaS account.

> This is a **parallel** backend. The Supabase scaffold in `../supabase/` is untouched; pick one
> (see BACKEND_OPTIONS.md). The browser client here is shaped like `../web/src/lib/session.js`
> so the front end can switch with minimal change.

## Why Durable Objects fit DropBoard

- **One DO instance per session = the ephemeral "room."** Its identity is the access code
  (`idFromName(code)`).
- **Real-time is built in** — the DO holds connected WebSockets and fans out item updates. No
  polling, no separate realtime service.
- **True ephemerality** — a DO `alarm()` fires at `expires_at` (or ~1s after a manual end) and
  wipes the room's R2 objects + all DO state. Nothing lingers, no history to scrub.
- **Files** live in **R2** (S3-compatible), served through the Worker so the bucket stays
  private.

```
cloudflare/
  wrangler.toml.example   # bindings: BOARDS (DO), DROPS (R2); vars + SESSION_SECRET
  src/
    index.ts        # Worker: routing + R2 file up/download
    board-room.ts   # BoardRoom Durable Object: state, WebSocket sync, TTL alarm
    token.ts        # HMAC-signed per-session tokens
    util.ts         # access codes + CORS/JSON
    types.ts
  examples/client.js
```

## Endpoints

| Method + path | Auth | Purpose |
|---|---|---|
| `POST /sessions` | — | Create a board → `access_code` + creator token |
| `POST /sessions/:code/join` | — | Join by code → participant token |
| `POST /sessions/:code/end` | creator token | End a board |
| `GET /sessions/:code/items` | token | List items |
| `POST /sessions/:code/items` | token | Add a text/link item |
| `GET /sessions/:code/ws?token=` | token | WebSocket for live updates |
| `POST /sessions/:code/files` | token | Upload a file to R2 + register item |
| `GET /sessions/:code/files/:key?token=` | token | Download a file |

Tokens are compact HMAC blobs (not JWTs) signed with `SESSION_SECRET`, carrying `{code, role,
exp}`. WebSocket auth uses `?token=` because browsers can't set `Authorization` on a socket.

## Deploy

```bash
cd cloudflare
npm install
cp wrangler.toml.example wrangler.toml   # edit ALLOWED_ORIGIN
wrangler r2 bucket create dropboard-drops
wrangler secret put SESSION_SECRET       # any long random string
wrangler deploy
# -> https://dropboard-backend.<subdomain>.workers.dev
```

Then point the front end at it (add `CF_BACKEND_URL` to `web/config.js` and use
`examples/client.js`).

### Smoke test

```bash
BASE="https://dropboard-backend.<subdomain>.workers.dev"
curl -sS -X POST "$BASE/sessions" -H "Content-Type: application/json" -d '{"ttl_hours":4}'
# use the returned access_code + session_token:
curl -sS -X POST "$BASE/sessions/TIGER-4821/join"
```

## Trade-offs / notes

- **In-memory WebSocket set.** Connected sockets live in the DO instance; if the DO is evicted
  while clients are connected they reconnect (the front end already re-fetches on reconnect).
  For higher durability, migrate to the WebSocket **Hibernation API**.
- **`session_id == access_code`** here (the room is keyed by code), unlike the Supabase design
  where they're separate. The client shape is otherwise the same.
- **Rate limiting** should be added at the Cloudflare edge (WAF / rate-limiting rules) for
  `POST /sessions` and `/join`.
- Access code entropy + join rate limits are the only barrier — same posture as the README.
