# Executive Report — DropBoard build session (context for a future chat)

> **Purpose:** paste this into a fresh Claude chat as standing context when working on the
> teaching deliverable (long-form article or video) for the prompt: *"teach an audience how to
> build something valuable you've created with AI coding tools."* It is self-contained — a new
> session needs nothing else to help you write the piece.

## 1. What the project is

**DropBoard** — a zero-friction, ephemeral "drop-space" in the browser. Start a session, share a
short access code (e.g. `TIGER-4821`), and everyone who joins can drop files/links/text onto one
shared board and grab each other's items in real time. No accounts. Boards auto-expire. Mobile
is first-class. It began as a README that doubles as a product/design brief.

**Design principles:** zero friction (usable board < 10s), ephemeral-first (expiry is a
feature), device-agnostic, legible at a glance.

## 2. What was built in this session (chronological)

| Commit | What |
|---|---|
| `1513cec` | Product design doc, prioritized backlog, static Pages scaffold, AI-proxy config, GitHub Actions deploy workflow |
| `7aae64a` | Merged with the existing remote README (preserved history, no force-push) |
| `2765f7d` | Supabase backend scaffold: schema, RLS, per-session JWT, Edge Functions (create/join/end/cleanup) |
| `e0b358f` | Backend/storage options analysis (GitHub-as-storage vs Supabase vs Cloudflare) |
| `a08822a` | Cloudflare (Workers + Durable Objects + R2) backend scaffold + a GitHub-store proof-of-concept |
| `7179d7e` | Functional board UI wired to a selectable backend; README progress update |
| `fd22177` | AI-proxy config quickstart (copied War-Games' config pattern) + aligned proxy-URL resolution |

Also done via the GitHub REST API (no `gh` CLI available — used the keychain git token): enabled
Pages, created **14 backlog issues** + **issue #15 "pick the backend."**

## 3. Artifacts & links

- **Repo (current):** https://github.com/Ethical-Tech-CoLab/dropboard (a fork; deploys the live site and has the proxy origin allowlisted). Original: https://github.com/alx-du/dropboard.
- **Live site (GitHub Pages, deployed & green):** https://ethical-tech-colab.github.io/dropboard/
- **Issues:** 14 backlog (P0/P1/P2) + #15 pick-a-backend decision — on the **original** repo (https://github.com/alx-du/dropboard/issues); the fork has Issues disabled.
- **Key docs:** `docs/PRODUCT_DESIGN.md`, `docs/BACKEND_OPTIONS.md`, `docs/BACKLOG.md`, `docs/quickstart-for-ai-proxy.md`, `docs/teaching/BUILD_LOG.md`

## 4. Architecture (as-built)

- **Frontend:** static single-page app in `web/` (vanilla JS, no build step), deployed to GitHub
  Pages via `.github/workflows/deploy-pages.yml`. Backend-agnostic via a one-line switch
  `DROPBOARD_CONFIG.BACKEND` in `web/config.js`, with adapters in `web/src/lib/backends/`.
- **Backend — Cloudflare chosen & DEPLOYED** (issue #15 effectively settled); two others scaffolded:
  - **Cloudflare** (`cloudflare/`, wired default, **LIVE** at `dropboard-backend.alex-x-du.workers.dev`):
    Workers + one **Durable Object per session** (WebSocket realtime + in-memory room state + TTL
    `alarm()` for true ephemerality) + **R2** for files. Same platform as the AI proxy. Create/join
    and CORS from the Pages origin verified working.
  - **Supabase** (`supabase/`): Postgres + **RLS** (per-session JWT carrying a `session_id`
    claim) + Realtime + Storage + Edge Functions.
  - **GitHub-store** (`prototypes/github-store/`): proof-of-concept only — Node proxy over a
    secret Gist; documented as a non-starter (not ephemeral, no realtime, text/links only).
- **AI:** the deployed `pages-ai-proxy` (OpenAI-compatible; injects the provider token
  server-side). Configured but **no product AI feature ships yet** (deferred, backlog #14).

## 5. The key decisions & rationale (the teaching substance)

1. **Agent asked clarifying questions before building** — surfaced that the AI proxy is AI-only
   and the app still needs a real backend. Avoided wasted work.
2. **Skeleton-first** — deployed an empty site + filed the backlog as issues before features.
3. **"Is there an alternative to Supabase?"** → produced a **tradeoff analysis** instead of a
   blind switch; explained why GitHub-as-storage fails (git history isn't ephemeral, no
   realtime, still needs a token-holding server) and recommended Cloudflare Durable Objects.
4. **Built for an undecided backend** — adapter layer keeps the app runnable while the choice
   stays open.
5. **Reuse over rebuild** — copied only the *config pattern* from the War-Games repo to use the
   existing proxy.

## 6. Current status & known gaps (be honest about these in the piece)

- ✅ **Runs end-to-end.** Frontend on Pages + Cloudflare backend deployed; create → join → drop
  → live-sync verified (including CORS from the Pages origin). The "drop a file, see it on my
  phone" demo is now real, not staged.
- ✅ **Cloudflare Worker is type-checked** (`npm run typecheck` passes; a real `.ts`-import bug was
  caught and fixed before deploy — a good teaching beat about verifying AI-written code).
- ⚠️ **Supabase adapter is unverified in-browser** (Cloudflare was chosen; Supabase left as a
  scaffolded alternative).
- ⚠️ **AI proxy is on a temporary tunnel** (Option A) and AI features are still deferred — nothing
  in the UI calls the proxy yet.
- **Deploy specifics:** backend at `dropboard-backend.alex-x-du.workers.dev`; getting there
  required three one-time Cloudflare account steps (enable R2, use `new_sqlite_classes` for DOs on
  the free plan, create a `workers.dev` subdomain) — all resolved.

## 7. The teaching deliverable

- **Prompt to answer:** "teach an audience how to build something valuable you've created with AI
  coding tools," demonstrated with a video or long-form text.
- **Chosen format:** written **build log** as the spine + a **3–4 min screen-capture demo**
  embedded. Rationale: the value is in the *decision loop* (which text captures precisely and
  reproducibly), and the deployed site/issues/commits are strong proof; the short video supplies
  "it actually runs" credibility.
- **Outline = the commit history** (8 commits → 8 chapters). Draft scaffold already written in
  `docs/teaching/BUILD_LOG.md`.
- **Thesis:** *the skill isn't prompting for code; it's running the decision loop* — brief →
  let the agent interview you → skeleton first → make it defend choices → wire something real →
  reuse over rebuild → stay honest.
- **Star beats:** (a) the agent asking clarifying questions before coding; (b) the
  "what else, and why not?" backend pivot.

## 8. Assets to gather for production

- Full Claude Code transcript of this session (for exact prompt/response excerpts).
- Screenshots: live site, Actions "deploy succeeded," issues board, BACKEND_OPTIONS table.
- A two-device sync GIF (record after deploying a backend).
- `git log --stat` (chapter markers).

## 9. Suggested asks for the future chat

- "Draft chapter 4 of the build log in full prose from the scaffold."
- "Write the 3-minute video script from the shot list in BUILD_LOG.md."
- "Turn this into a 1,500-word Medium article aimed at [audience]."
- "Write 5 social hooks / a thumbnail concept for the video."
