# DropBoard — Backlog

Prioritized, build-ready backlog derived from [PRODUCT_DESIGN.md](./PRODUCT_DESIGN.md).
Each item below is mirrored as a **GitHub issue** in this repo (same title). This document is
the human-readable source of truth; the issues are the trackable units of work.

**Legend:** `P0` = do first / blocks everything · `P1` = MVP · `P2` = post-MVP / nice-to-have.

---

## ▶ Recommended: what to do first

Build the **thinnest vertical slice that proves the architecture**, then layer features.

1. **#1 Repo, Pages deploy, and proxy config** *(P0)* — ship a static page to GitHub Pages via
   Actions and wire the AI proxy URL + origin allow-list. Proves the front-end delivery path
   end-to-end before any feature exists.
2. **#2 Supabase project + schema + RLS** *(P0)* — stand up the BaaS with `sessions`/`items`
   tables, RLS, and the per-session JWT scheme. This is the security spine everything hangs on;
   getting RLS right first avoids a painful retrofit.
3. **#3 Create / join session by code** *(P0)* — the first real user flow and the gate to every
   other feature. Once a browser can create a board and another can join by code, the product
   exists in skeleton form.

After that slice works: **#4 drop text → #5 realtime sync → #6 drop files → #7 drop links**,
then ephemerality (**#8**), then post-MVP polish.

> Rationale: sync and storage are the risky, foundational parts. Do the boring, load-bearing
> infrastructure (deploy + RLS + sessions) first so feature work lands on a stable base. AI
> features are intentionally deferred (see #14).

---

## P0 — Foundation (do first)

### #1 Repo scaffold, GitHub Pages deploy, and AI proxy configuration
Static `web/` app deploys to Pages via GitHub Actions; `config.js` carries the proxy URL and
Supabase config; proxy `ALLOWED_ORIGINS` includes the Pages origin.
**Done when:** pushing to default branch publishes the site; a health-check call to the proxy
succeeds from the deployed origin. *(Scaffold + workflow already in this repo.)*

### #2 Supabase project, schema, RLS, and per-session JWT
Create project; apply `sessions`/`items`/`participants` schema; enable RLS; implement the
Edge-Function-minted session token carrying `session_id`; add policies scoping every table.
**Done when:** a token for session A cannot read/write/subscribe to session B (verified test).

### #3 Create & join session by access code
`create-session` + `join-session` Edge Functions; front-end create/join flows; human-readable,
unguessable codes.
**Done when:** one device creates a board and gets a code; another device joins with it and
lands on the same (empty) board.

---

## P1 — MVP features

### #4 Drop text notes
Central `addItem()` path; text items render as copy-with-one-tap cards.
**Done when:** typing a note inserts an `items` row and shows a card.

### #5 Realtime sync of items
Subscribe to `items` filtered by session; optimistic insert + reconcile; reconnect handling.
**Done when:** an item dropped on one device appears on another within ~1s without refresh.

### #6 Drop files (upload + signed download)
Storage bucket + path-per-session; upload with progress + cancel; short-TTL signed download
URLs; server-enforced size/type caps.
**Done when:** a file dropped on one device downloads on another via a signed URL.

### #7 Drop links with preview
Link cards; `link-preview` Edge Function for title/favicon with graceful CORS fallback.
**Done when:** a pasted URL renders a clickable card; preview failure degrades to bare URL.

### #8 Ephemerality: timed + manual end + cleanup
`expires_at` default (4h); `end-session`; scheduled `cleanup` deleting storage objects then
rows, idempotently.
**Done when:** expired/ended sessions have all rows and files removed; cleanup is retry-safe.

### #9 Mobile & accessibility pass
Mobile-first join flow; ≥44px targets; keyboard operability; focus states; reduced-motion.
**Done when:** the full create→join→drop→grab loop is usable one-handed on a phone and via
keyboard only.

### #10 Front-end security hardening
Escape/sanitize all rendered text and link titles; `rel="noopener noreferrer"`; pre-drop
warning about access-code sensitivity.
**Done when:** a text item containing markup renders inert; external links open safely.

---

## P2 — Post-MVP / nice-to-haves

### #11 End-of-session "save everything" export
Before cleanup, offer each participant a one-click export (zip of files + manifest of
links/text) against live signed URLs. *(README "Extend/save".)*

### #12 QR code join + item attribution + board organization
QR next to the code; optional display names; loose clustering/columns.

### #13 Session lock, extend, abuse reporting
Host can freeze/close the board or extend its lifetime; lightweight report action for leaked
codes; rate-limit tuning.

### #14 (Deferred) AI features via pages-ai-proxy
Proxy is wired (#1) but no AI feature ships yet. Candidate first feature: AI link summaries or
a board assistant. **Blocked on a product decision, not on infrastructure.**

---

## Cross-cutting / definition-of-done notes

- Every DB access path is covered by an RLS policy — no client-side-only filtering.
- Client-side limits (size/type) mirror server limits but are never the source of truth.
- Nothing dynamic is assumed to survive expiry; export must precede cleanup.
