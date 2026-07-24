# Build Log — Building & Deploying DropBoard with an AI Coding Agent

> **What this is:** a fill-in-the-blanks scaffold for the teaching piece (long-form article or
> video script) answering *"teach an audience how to build something valuable you've created
> with AI coding tools."* Structure is done; you add your voice, media, and exact prompt
> excerpts where marked `[ … ]`.
>
> **Format decision:** written build log as the spine + a 3-min screen-capture demo embedded.
> See [EXECUTIVE_REPORT.md](./EXECUTIVE_REPORT.md) for the full context.

**Live artifacts to link throughout:**
- Repo: https://github.com/alx-du/dropboard
- Live site: https://alx-du.github.io/dropboard/
- Backlog issues: https://github.com/alx-du/dropboard/issues
- Design docs: [PRODUCT_DESIGN.md](../PRODUCT_DESIGN.md) · [BACKEND_OPTIONS.md](../BACKEND_OPTIONS.md) · [quickstart-for-ai-proxy.md](../quickstart-for-ai-proxy.md)

---

## 0. Hook (write last, ~150 words)

- [ ] Open with the *problem*, not the tool: "Moving files between people mid-meeting is still weirdly painful." (Pull from the README.)
- [ ] The promise to the audience: *by the end you'll know how to direct an AI agent to design, build, and deploy a real app — and, more importantly, when to slow it down.*
- [ ] The one-line thesis: **The skill isn't prompting for code; it's running the decision loop.**
- [ ] `[SCREENSHOT/GIF: the deployed board with items syncing]`

## 1. Start from a brief, not a blank page
**Commit:** [`1513cec`](https://github.com/alx-du/dropboard/commit/1513cec) · **Lesson: give the agent a design brief to reason against.**

- [ ] Show the starting point: a README that doubles as a product brief (problem, features, non-goals, principles).
- [ ] Teaching point: a good brief front-loads *constraints* (ephemeral, zero-friction, device-agnostic) so every later decision has something to check against.
- [ ] `[PASTE: your first instruction to the agent]`
- [ ] Contrast: what "make me an app" gets you vs. what a brief gets you.

## 2. Let the AI interview you *before* it builds
**Lesson: the highest-leverage prompt is the one where the agent asks YOU questions.** ⭐ (your strongest beat)

- [ ] The moment: instead of coding, the agent asked three clarifying questions — AI's role, backend approach, and how to handle the GitHub side.
- [ ] `[SCREENSHOT: the clarifying-questions UI with the options]`
- [ ] Why it matters: it surfaced a hidden mismatch early — *the AI proxy is AI-only; the app still needs a real backend.* Caught before a line of wasted code.
- [ ] Takeaway box: **"Tell the agent it's allowed to ask questions, and answer them honestly. This is where architecture actually happens."**

## 3. Ship the skeleton before the features
**Commit:** [`1513cec`](https://github.com/alx-du/dropboard/commit/1513cec) · **Lesson: get a deployable, empty thing live on day one.**

- [ ] What shipped first: a static page deployed to GitHub Pages via Actions + the backlog filed as 14 GitHub issues — *before* any feature.
- [ ] `[SCREENSHOT: the Actions "deploy succeeded" run + the issues board]`
- [ ] Teaching point: a live URL + a visible backlog turns "a big scary project" into "a running thing with a to-do list."
- [ ] Note the honesty: the agent couldn't reach GitHub at first (no `gh`); show how that was resolved (keychain token + REST API). Real friction, real fix.

## 4. Make the AI defend its choices ⭐⭐ (the star lesson)
**Commits:** [`2765f7d`](https://github.com/alx-du/dropboard/commit/2765f7d) → [`e0b358f`](https://github.com/alx-du/dropboard/commit/e0b358f) → [`a08822a`](https://github.com/alx-du/dropboard/commit/a08822a) · **Lesson: use the agent to explore the design space, not just emit code.**

- [ ] Setup: the agent scaffolded a Supabase backend (schema, RLS, per-session JWT, Edge Functions).
- [ ] The pivot — your prompt (paste verbatim): *"is there another option instead of using supabase? can Github API be used to store small things like links, small files, text, etc, in our repo temporarily?"*
- [ ] The payoff: instead of blindly switching, the agent produced a **tradeoff analysis** ([BACKEND_OPTIONS.md](../BACKEND_OPTIONS.md)) — why GitHub-as-storage fails (git history isn't ephemeral, no realtime, still needs a token-holding server) and recommended **Cloudflare Durable Objects** (same platform as the proxy).
- [ ] It then scaffolded *three* backends so the decision could be made from working code: Supabase, Cloudflare, and a GitHub-store proof-of-concept.
- [ ] `[SCREENSHOT: the BACKEND_OPTIONS comparison table]`
- [ ] Takeaway box: **"When the AI proposes X, ask 'what else, and why not?' You get an architect, not a code vending machine."**

## 5. Wire something real (and swappable)
**Commit:** [`7179d7e`](https://github.com/alx-du/dropboard/commit/7179d7e) · **Lesson: build for the decision you haven't made yet.**

- [ ] What shipped: a functional board UI (create/join, drop text·links·files, live sync, end) behind a one-line backend switch in `web/config.js`.
- [ ] `[GIF: dropping a link on one device, appearing on another]` *(record after deploying a backend)*
- [ ] Teaching point: a thin adapter layer let the app stay runnable while the backend decision stayed open (tracked in [issue #15](https://github.com/alx-du/dropboard/issues/15)).

## 6. Reuse, don't rebuild
**Commit:** [`fd22177`](https://github.com/alx-du/dropboard/commit/fd22177) · **Lesson: copy configuration, not infrastructure.**

- [ ] The task: use an existing deployed AI proxy without recreating it — by reading another repo (War-Games) and copying only its *config pattern*.
- [ ] Result: [quickstart-for-ai-proxy.md](../quickstart-for-ai-proxy.md) — one URL in config, one origin on the proxy, no key in the browser.
- [ ] Teaching point: agents are great at "go read how that other project does it and adapt the minimal slice."

## 7. The meta-lessons (the part audiences remember)

- [ ] **Honesty beats hype.** The agent flagged what it *couldn't* verify (untype-checked Worker TS, unverified Supabase adapter, app not yet end-to-end). Model this for your audience — show the caveats.
- [ ] **Git history is the narrative.** Eight commits = eight chapters. `git log` wrote your outline.
- [ ] **Human-in-the-loop is the product.** Every good turn came from a human decision: a brief, an answer to a question, a "what else?", a redirect.
- [ ] **Preserve as you go.** The transcript + commits + issues + live site are the teaching material.

## 8. Call to action

- [ ] Point readers/viewers to the repo and the live site.
- [ ] One reproducible next step for them: *"clone it, deploy the Cloudflare backend, drop a file between your phone and laptop."*
- [ ] `[Your channel / newsletter / contact]`

---

## Companion demo video shot list (3–4 min)
1. `[00:00]` The problem — 1 sentence + the pain (10s).
2. `[00:15]` The live app: create a board, share the code, drop a link/file, watch it sync on a second device (45s). ⭐ money shot.
3. `[01:00]` Fast-cut of the real session: the clarifying-questions moment + the "any alternative to Supabase?" pivot (60s).
4. `[02:00]` The artifacts: deployed Pages, the issues board, BACKEND_OPTIONS.md (30s).
5. `[02:30]` The three meta-lessons on screen (45s).
6. `[03:15]` CTA (15s).

## Production checklist
- [ ] Deploy the Cloudflare backend so the sync demo is real (not mocked).
- [ ] Export the full Claude Code transcript; pull 3–4 exact prompt/response excerpts.
- [ ] Capture: live site, Actions success, issues board, BACKEND_OPTIONS table.
- [ ] Record the two-device sync GIF.
- [ ] Decide channel + length; write the hook last.
