#!/usr/bin/env bash
# Create the DropBoard backlog as GitHub issues (mirrors docs/BACKLOG.md).
# Requires: gh CLI authenticated (gh auth status), run from inside the repo.
#
# Usage: bash scripts/create-backlog-issues.sh
set -euo pipefail

# Ensure labels exist (ignore "already exists" errors).
gh label create P0 --color B60205 --description "Do first / foundational" 2>/dev/null || true
gh label create P1 --color FBCA04 --description "MVP feature" 2>/dev/null || true
gh label create P2 --color 0E8A16 --description "Post-MVP / nice-to-have" 2>/dev/null || true
gh label create deferred --color CCCCCC --description "Blocked on a product decision" 2>/dev/null || true

mk() { # mk "<title>" "<labels>" "<body>"
  gh issue create --title "$1" --label "$2" --body "$3"
}

mk "Repo scaffold, GitHub Pages deploy, and AI proxy configuration" "P0" \
"Static \`web/\` app deploys to Pages via GitHub Actions; \`config.js\` carries the proxy URL and Supabase config; proxy \`ALLOWED_ORIGINS\` includes the Pages origin.

**Done when:** pushing to the default branch publishes the site; a health-check call to the proxy succeeds from the deployed origin.

See docs/PRODUCT_DESIGN.md §5–6 and docs/BACKLOG.md #1."

mk "Supabase project, schema, RLS, and per-session JWT" "P0" \
"Create project; apply \`sessions\`/\`items\`/\`participants\` schema; enable RLS; mint a per-session JWT (Edge Function) carrying \`session_id\`; add policies scoping every table.

**Done when:** a token for session A cannot read/write/subscribe to session B (verified test).

See docs/PRODUCT_DESIGN.md §4 and docs/BACKLOG.md #2."

mk "Create & join session by access code" "P0" \
"\`create-session\` + \`join-session\` Edge Functions; front-end create/join flows; human-readable, unguessable codes.

**Done when:** one device creates a board and gets a code; another joins with it and lands on the same empty board.

See docs/BACKLOG.md #3."

mk "Drop text notes" "P1" \
"Central \`addItem()\` path; text items render as copy-with-one-tap cards.

**Done when:** typing a note inserts an \`items\` row and shows a card. See docs/BACKLOG.md #4."

mk "Realtime sync of items" "P1" \
"Subscribe to \`items\` filtered by session; optimistic insert + reconcile; reconnect handling.

**Done when:** an item dropped on one device appears on another within ~1s without refresh. See docs/BACKLOG.md #5."

mk "Drop files (upload + signed download)" "P1" \
"Storage bucket + path-per-session; upload with progress + cancel; short-TTL signed download URLs; server-enforced size/type caps.

**Done when:** a file dropped on one device downloads on another via a signed URL. See docs/BACKLOG.md #6."

mk "Drop links with preview" "P1" \
"Link cards; \`link-preview\` Edge Function for title/favicon with graceful CORS fallback.

**Done when:** a pasted URL renders a clickable card; preview failure degrades to bare URL. See docs/BACKLOG.md #7."

mk "Ephemerality: timed + manual end + cleanup" "P1" \
"\`expires_at\` default (4h); \`end-session\`; scheduled \`cleanup\` deleting storage objects then rows, idempotently.

**Done when:** expired/ended sessions have all rows and files removed; cleanup is retry-safe. See docs/BACKLOG.md #8."

mk "Mobile & accessibility pass" "P1" \
"Mobile-first join flow; >=44px targets; keyboard operability; focus states; reduced-motion.

**Done when:** the full create->join->drop->grab loop is usable one-handed on a phone and via keyboard only. See docs/BACKLOG.md #9."

mk "Front-end security hardening" "P1" \
"Escape/sanitize all rendered text and link titles; \`rel=noopener noreferrer\`; pre-drop warning about access-code sensitivity.

**Done when:** a text item containing markup renders inert; external links open safely. See docs/BACKLOG.md #10."

mk "End-of-session 'save everything' export" "P2" \
"Before cleanup, offer each participant a one-click export (zip of files + manifest of links/text) against live signed URLs (README 'Extend/save'). See docs/BACKLOG.md #11."

mk "QR code join + item attribution + board organization" "P2" \
"QR next to the code; optional display names; loose clustering/columns. See docs/BACKLOG.md #12."

mk "Session lock, extend, abuse reporting" "P2" \
"Host can freeze/close the board or extend its lifetime; lightweight report action for leaked codes; rate-limit tuning. See docs/BACKLOG.md #13."

mk "(Deferred) AI features via pages-ai-proxy" "P2,deferred" \
"Proxy is wired (#1) but no AI feature ships yet. Candidate first feature: AI link summaries or a board assistant. Blocked on a product decision, not on infrastructure. See docs/BACKLOG.md #14."

echo "Done. Created backlog issues."
