# DropBoard 🗂️

**A shared drop-space in your browser.** Drop files, links, and text onto a board that everyone in your session can see and grab — no accounts, no installs, no "can you email that to me?"

> *Working name — alternatives under consideration: SessionBoard, Corkboard, Handoff.*

---

## The Problem

Moving stuff between people (or between your own devices) mid-meeting is still weirdly painful:

- Someone shares a link in a video call chat, and it's gone when the call ends.
- Hackathon teammates ping files across three different messaging apps.
- You're at a podium laptop and your slides are on your phone.
- AirDrop only works Apple-to-Apple; email is overkill for a URL.

Existing tools (Slack, Drive, Miro) assume everyone is already in the same workspace with the same accounts. **DropBoard assumes nothing** — just a browser and a code.

## How It Works

1. **Start a session.** Anyone can open the site and create a board. They get a short access code (e.g., `TIGER-42`).
2. **Others join.** Teammates enter the code on any device — laptop, phone, tablet — and land on the same board.
3. **Drop things.** Drag files onto the board, paste links, or type quick text notes. Items appear for everyone in real time.
4. **Grab things.** Anyone in the session can open links, copy text, or download files.
5. **Session ends.** Boards are ephemeral by default — they expire after a set period (e.g., 24 hours) and content is deleted.

### Solo mode

The same flow works for one person on multiple devices: start a session on your laptop, enter the code on your phone, and hand files or links back and forth without cables or cloud accounts.

## Core Features (MVP)

| Feature | Description |
|---|---|
| Session creation | One click, no account required; generates a human-readable access code |
| Join by code | Enter code → instantly on the board; works on mobile browsers |
| Drop files | Drag-and-drop or tap-to-upload; reasonable size cap (e.g., 100 MB/file) |
| Drop links | Pasted URLs render as clickable cards with title/favicon preview |
| Drop text | Quick sticky-note-style snippets; copy with one tap |
| Live sync | New items appear for all participants in real time |
| Ephemeral by default | Sessions auto-expire; nothing is stored long-term |

## Nice-to-Haves (Post-MVP)

- **QR code join** — display a QR next to the access code for instant mobile join
- **Item attribution** — optional display names so you know who dropped what
- **Board organization** — drag items into loose clusters or columns
- **Session lock** — host can freeze the board or close it to new joiners
- **Extend/save** — option to extend a session's lifetime or export the board as a zip
- **Paste-to-drop** — paste an image or file directly from the clipboard

## Non-Goals

To stay focused, DropBoard deliberately does **not** try to be:

- A persistent file storage service (that's Drive/Dropbox)
- A drawing or diagramming whiteboard (that's Miro/Excalidraw/FigJam)
- A chat app — no threads, no messages, just artifacts
- An identity system — no accounts, profiles, or permissions beyond the session code

## Design Principles

1. **Zero friction.** Time from landing page to usable board: under 10 seconds. No signup walls, ever.
2. **Ephemeral first.** Users shouldn't worry about cleanup or lingering data. Expiry is a feature, not a limitation.
3. **Device-agnostic.** If it has a modern browser, it works. Mobile is a first-class citizen, not an afterthought.
4. **Legible at a glance.** A board full of items should be scannable in a projector view during a meeting.

## Architecture Sketch

*(Subject to change — early thinking.)*

- **Frontend:** Single-page web app; drag-and-drop upload, clipboard paste handling, responsive layout for mobile join
- **Real-time sync:** WebSockets (or a managed service like Supabase Realtime / Firebase) to broadcast board updates to session participants
- **File storage:** Object storage (S3-compatible) with signed URLs; lifecycle rules auto-delete files at session expiry
- **Sessions:** Short-lived records keyed by access code; codes are unguessable enough to resist casual snooping (dictionary word + number, or 6+ character alphanumeric)
- **No database of users** — sessions and their contents are the only state

## Security & Privacy Considerations

- Access codes are the only barrier — treat them like a meeting link, not a password. Docs should be clear about this.
- All transfers over HTTPS; files served via expiring signed URLs
- Auto-deletion on expiry, with no long-term retention
- File-type screening and size limits to prevent abuse
- Rate limiting on session creation and joins

## Open Questions

- [ ] Should the session creator have any special powers (delete items, end session), or is everyone equal?
- [ ] What's the right default expiry — end of "meeting length" (2–4 hrs) or a full day?
- [ ] Free hosting limits: what file size cap is sustainable without a payment model?
- [ ] Do we need any lightweight moderation/abuse reporting for public codes that leak?

## Progress

_Updated 2026-07-24 — **live and working end-to-end.**_

- **✅ It runs.** Open **https://ethical-tech-colab.github.io/dropboard/**, start a board, join from another device, and drop text/links/files that sync in real time.
- **Frontend** — a functional single-page app (create/join a board, drop text · links · files, live sync, end session) on **GitHub Pages**. Backend-agnostic — one switch in [`web/config.js`](web/config.js) points it at a backend.
- **Backend (deployed):**
  - [`cloudflare/`](cloudflare/) — Workers + **Durable Objects** (WebSocket sync + TTL) + **R2** files. **Deployed & live**, wired as the default.
  - [`supabase/`](supabase/) — Postgres + **RLS** + Realtime + Storage + Edge Functions. Scaffolded alternative.
  - [`prototypes/github-store/`](prototypes/github-store/) — proof of concept of the "store in GitHub/Gist" idea (demo only; not ephemeral/real-time).
- **AI proxy** — [`pages-ai-proxy`](https://github.com/Ethical-Tech-CoLab/pages-ai-proxy) configuration wired; product AI features deferred.
- **Docs & tracking** — [docs/PRODUCT_DESIGN.md](docs/PRODUCT_DESIGN.md) (front-end/back-end guidelines + architecture), [docs/BACKEND_OPTIONS.md](docs/BACKEND_OPTIONS.md), [docs/BACKLOG.md](docs/BACKLOG.md). The backlog is mirrored as GitHub issues.

### Repository layout

```
web/          static SPA (GitHub Pages) — index.html, src/app.js, src/lib/*
cloudflare/   Workers + Durable Objects + R2 backend
supabase/     Postgres + RLS + Edge Functions backend
prototypes/   github-store proof of concept
docs/         design brief, backend options, backlog
.github/      Pages deploy workflow
```

### Run it

It's static — no build. Set `CF_BACKEND_URL` (or Supabase config) in [`web/config.js`](web/config.js), deploy a backend (see the backend's README), then serve `web/` (e.g. `python3 -m http.server` inside it) or use the live Pages URL above.

## Status

🟢 **Working demo.** Frontend on GitHub Pages + the Cloudflare backend are deployed and the full create → join → drop → live-sync → end loop works end-to-end. Supabase remains a scaffolded alternative (the **pick-a-backend** decision, issue #15, is effectively settled on Cloudflare). AI features are still deferred. This README doubles as the design brief — feedback welcome via an issue.
