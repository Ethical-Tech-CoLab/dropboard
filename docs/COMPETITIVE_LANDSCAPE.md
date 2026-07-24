# DropBoard — Competitive Landscape

_Snapshot as of 2026-07-24. A step-back scan of what already exists near DropBoard, where it
overlaps, and where it's actually differentiated. Useful for the teaching write-up and for future
product decisions._

## Verdict

The individual ingredients all exist and a couple of tools sit very close, but DropBoard's exact
combination isn't a mainstream product. It lives at the **intersection of two crowded categories**
without being identical to the leaders in either. That intersection is a **wedge, not a blue
ocean**.

DropBoard's full blend: **no account · short human access code · a shared _board_ of files *and*
links *and* text · real-time for everyone · auto-expiry · any browser (mobile-first).**

## Category 1 — "AirDrop for the web" (file transfer, no account, code/link)

Nail the **no-account + ephemeral + cross-device** part (often with a code/key, like our access
code) — but they're **file transfer, not a shared board** of mixed content.

| Tool | Close on | Missing vs. DropBoard |
|---|---|---|
| **Snapdrop / ShareDrop / PairDrop** | Browser P2P (WebRTC), no signup; ShareDrop/PairDrop add QR + cross-network | No persistent board; files only |
| **Send Anywhere** | **6-digit key** to pair devices (≈ our code); large files | Files only; not a shared board |
| **Wormhole** | E2E encrypted, **auto-expiring links**, no account | Files only; 1:1 link, not a board |
| **ToffeeShare · LocalSend · storage.to · Internxt Send** | No-account, any-size, expiring | Files only |

## Category 2 — "shareable board" for mixed content

Nail the **board of files + links + notes** part — but require **accounts** and are **not
ephemeral**.

| Tool | Close on | Missing vs. DropBoard |
|---|---|---|
| **Padlet** | Closest *conceptual* cousin: drop links/files/notes on a board, share by link | Sign-up required; persistent; freemium caps |
| **Lino · Wakelet** | Free-ish boards of mixed content | Accounts; meant to last |
| **Miro · Mural · FigJam** | Rich collaborative boards | Accounts; heavyweight; persistent |

## Closest matches

- **Send Anywhere / Wormhole** — closest on the *code + ephemeral + no-login* axis (but files only).
- **Padlet** — closest on the *drop mixed stuff onto one board* axis (but account-gated, permanent).
- **Purpose-built ephemeral "drop room" tools** (e.g. drop.lol–style share-a-room-and-drop apps)
  occupy almost exactly this niche. Current status unconfirmed in this scan — **verify directly**
  before making any "nothing like it exists" claim.

## Where DropBoard is actually differentiated

No mainstream product combines **all** of: no account · short human code · a board of files **and**
links **and** text · real-time for everyone · auto-expiry · works in any browser. The
*mixed-content board + no-account + ephemeral* blend is the honest differentiator.

## Implications

- **As a teaching project:** neighbors existing is fine and expected — the value is demonstrating
  *how it was built and shipped with AI coding tools*, not inventing a category.
- **As a product:** differentiation is thin against pure file-transfer tools, so it would need to
  lean into a specific moment:
  - the **meeting / hackathon hand-off** — "everyone grabs from one board" vs. 1:1 transfer,
  - **projector-legibility** (scannable board in a room),
  - the **<10s, zero-signup** promise,
  - mixed content (files + links + text) in one ephemeral place.

## Sources

- Snapdrop alternatives — https://www.mobikin.com/mobile-phone/snapdrop-alternative.html
- PairDrop alternatives — https://www.mobikin.com/mobile-phone/pairdrop-alternative.html
- No-app, auto-delete sharing — https://speedyshare.app/blog/snapdrop-alternative
- Wormhole alternatives — https://sourceforge.net/software/product/Wormhole/alternatives
- Padlet alternatives — https://miro.com/al/padlet-alternatives/

> Note: this is a point-in-time scan; the space moves. Re-verify before citing it publicly.
