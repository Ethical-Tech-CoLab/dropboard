# DropBoard — Backend & Storage Options

**Status:** Decision record / analysis · **Question:** Do we need Supabase, or can we use the
**GitHub API** to store small things (links, small files, text) in the repo temporarily? What
are the alternatives?

**TL;DR:** Using GitHub as a datastore is *technically* possible for tiny text/links, but it's a
poor fit **and doesn't remove the need for a backend**. If the goal is fewer moving parts, the
best "not Supabase" option is **Cloudflare (Workers + Durable Objects + R2)** — the same
platform the [`pages-ai-proxy`](https://github.com/Ethical-Tech-CoLab/pages-ai-proxy) already
deploys to. See [PRODUCT_DESIGN.md](./PRODUCT_DESIGN.md) for the current (Supabase) design.

---

## Can the GitHub API store our data?

Yes, technically. GitHub exposes several write APIs:

- **Contents API** — create/update/delete files in a repo (each write is a commit).
- **Gists API** — text snippets / small files, public or secret.
- **Issues / Issue Comments API** — text stored as issue bodies/comments.
- **Git Data API** — low-level blobs/trees/refs.

So links, text, and *small* files could physically live in a repo or gists. But that's not the
same as it being a good fit.

## The key catch: it does NOT remove the backend

Every GitHub write API requires a token with **write scope**. A static GitHub Pages site
**cannot hold a secret** — that is the exact reason the `pages-ai-proxy` exists. Embedding a
token in the frontend means anyone can extract it and write to (or damage) the repo.

> You would **still** need a token-holding server/function in front of GitHub. GitHub-as-storage
> doesn't remove infrastructure — it just points the infrastructure you already need at a worse
> datastore.

## Dealbreakers for DropBoard specifically

| Requirement (from README / design) | GitHub API reality |
|---|---|
| **Ephemeral — "nothing stored long-term"** | Deletes are commits; **content stays in git history forever** unless you rewrite history (force-push / filter-repo). A dropped file or pasted secret is effectively permanent. Violates Design Principle #2. |
| **Real-time sync (MVP feature #5)** | No push / WebSockets. You must **poll** every few seconds — laggy and burns rate limit. |
| **Many people dropping at once** | Contents API needs the current file SHA; concurrent writers get **409 conflicts**. Git is not a multi-writer store. |
| **Rate limits** | ~5,000 requests/hour per token, plus secondary abuse limits. A shared board polling + writing exhausts this quickly. |
| **File size (README wants up to 100 MB)** | Contents API is realistically good only for **< 1 MB**; repo/blob limits make real files a non-starter (Git LFS is separate). |
| **Privacy** | Public repo (needed for free Pages) = everything world-readable at predictable URLs. Private repo = Pages requires a paid plan. |
| **Terms / abuse** | Bulk arbitrary user uploads into a code repo is off-label and can trip GitHub's abuse detection. |

## Where GitHub-as-storage *could* work

A deliberately narrow variant:

- **Solo mode** or very small, low-frequency boards.
- **Text / links only** (no large files).
- Tolerant of a few seconds of **polling latency** (no true real-time).
- OK with content persisting in **git history** (not truly ephemeral).
- Still fronted by a small **proxy/function** that holds the token.

As a zero-infra hackathon/demo, a **secret-Gist-behind-a-proxy** store is viable — but it
contradicts several of DropBoard's stated principles, so it's a demo shortcut, not the product.

---

## Options compared

| Option | Real-time | Files | True ephemerality | Holds its own secret? | Ops / fit |
|---|---|---|---|---|---|
| **GitHub API (Contents/Gists)** | ❌ poll only | ⚠️ < ~1 MB | ❌ lives in git history | ❌ needs a proxy anyway | Off-label; poor fit |
| **Supabase** (current design) | ✅ Realtime | ✅ Storage + signed URLs | ✅ delete on expiry | ✅ (service key server-side) | Separate BaaS account |
| **Cloudflare** (Workers + Durable Objects + R2) | ✅ WebSockets via DO | ✅ R2 (S3-compatible) | ✅ DO state + TTL evaporates | ✅ Workers secrets | **Same platform as the proxy** |
| **Firebase** | ✅ Firestore/RTDB | ✅ Storage | ✅ TTL / rules | ✅ | Same class as Supabase |
| **PartyKit** (wraps Durable Objects) | ✅ | via R2 | ✅ | ✅ | Least boilerplate for rooms |

## Recommendation

- **If the goal is "fewer moving parts / stay on infra we already use":** go
  **Cloudflare — Workers + Durable Objects + R2.** Durable Objects are almost purpose-built for
  ephemeral session "rooms": real WebSocket sync, per-session in-memory state with a TTL (true
  ephemerality — state just evaporates, no history), R2 for files with signed URLs, and it
  shares platform + ops with the `pages-ai-proxy` you already deploy. **PartyKit** is a friendly
  wrapper if you want less boilerplate.
- **If the goal is "prove a concept with literally zero backend today":** use the narrow
  **Gist-behind-a-proxy** variant, accepting the caveats above (text/links only, polling, git
  history is permanent).
- **Do not** use GitHub-as-storage as the general backend — it fails ephemerality, real-time,
  concurrency, and file-size requirements while still needing a server.

## Status of current scaffold

The repo currently contains the **Supabase** backend scaffold (`supabase/`, backlog #2/#3).
Nothing here has been ripped out. If we choose Cloudflare, the front-end session helpers
(`web/src/lib/session.js`) stay largely the same — only the backend implementation behind the
create/join/end endpoints and the realtime transport change.
