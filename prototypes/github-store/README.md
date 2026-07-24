# DropBoard — GitHub-store prototype (proof of concept)

A deliberately minimal demo of the **"store data in GitHub"** option from
[../../docs/BACKEND_OPTIONS.md](../../docs/BACKEND_OPTIONS.md). A tiny Node proxy holds a GitHub
token server-side and keeps a board as a **secret Gist** (`board.json`). The demo page polls it.

**This is a shortcut for demos — not the product.** It exists to make the trade-offs concrete.

## What it is / isn't

| ✅ Shows | ❌ Does not / cannot |
|---|---|
| You can store text + links with zero database | Real-time (the demo **polls every 3s**) |
| The token stays server-side (never in the browser) | Files of any real size (text/links only) |
| A board is just a gist you can inspect | **Ephemerality** — content persists in gist history |
| ~30 lines of storage logic | Safe concurrency — appends are **last-writer-wins** |

## Why this isn't the real backend

- **You still need a server.** GitHub write APIs require a token with write scope, and a static
  Pages site can't hold a secret — hence this proxy. GitHub-as-storage does not remove the
  backend, it just changes what the backend talks to.
- **Not ephemeral.** Deleting/patching a gist leaves prior content in its **revision history**.
  DropBoard's whole premise ("nothing stored long-term") is violated.
- **Not real-time.** No push; you poll, which is laggy and burns GitHub's ~5,000 req/hr limit.
- **Not concurrent.** Two people dropping at once → one append can clobber the other (this
  prototype does a naive read-modify-write; it does not resolve conflicts).
- **Not for files.** The Gist/Contents sweet spot is small text; real files don't fit.

For anything beyond a solo/text-only demo, use **Cloudflare** (`../../cloudflare/`) or
**Supabase** (`../../supabase/`).

## Run it

```bash
# token needs only the `gist` scope
GITHUB_TOKEN=ghp_xxx node server.mjs      # -> http://localhost:8799
```

Then open `demo.html` in a browser (it points at `http://localhost:8799`). Click **Create
board**, share the board id, and drop text/links. Open the same id in another tab to see them
appear (after the next 3s poll).

### Endpoints

| Method + path | Purpose |
|---|---|
| `POST /board` | Create a board (secret gist) → `{ board_id }` |
| `GET /board/:id` | Read `{ items }` |
| `POST /board/:id/items` | Append a `text` or `link` item |

## Cleanup

Because gists persist, "ending" a board here means **deleting the gist** (and even then the
account's gist history/API caches may retain traces). Delete via the API:

```bash
curl -X DELETE -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/gists/<id>
```
