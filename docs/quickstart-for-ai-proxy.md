# Quickstart — AI proxy (config-only, War-Games style)

**Goal:** reuse the already-deployed [`pages-ai-proxy`](https://github.com/Ethical-Tech-CoLab/pages-ai-proxy)
from a static GitHub Pages front end **by configuration alone** — no proxy to build, no server
to run. This copies the pattern that the
[War-Games](https://github.com/Ethical-Tech-CoLab/War-Games) repo uses; we take its *config
approach*, not its code.

> Update the placeholders below (proxy URL, origin) later as your instructions evolve — this doc
> is the single place that describes the wiring.

---

## The one idea

GitHub Pages is static: it can't hold a secret or get around CORS. The `pages-ai-proxy` is the
missing server piece — it injects the provider token server-side and adds CORS headers. So the
front end never holds a real key; it just **POSTs OpenAI-style requests at the proxy URL**.

```
Browser (Pages app)  ──►  pages-ai-proxy  ──►  OpenAI-compatible model API
   no real key            injects token,         (GitHub Models, OpenAI, …)
   (CORS-safe)            checks Origin
```

## How War-Games configures it (reference)

- **`js/config.js`** holds the endpoint in one place:
  ```js
  llm: {
    provider: 'openai',
    proxyUrl: 'https://<sub>.trycloudflare.com/v1/chat/completions', // the deployed proxy
    model: 'gpt-4o-mini',
    apiKey: '',            // empty — the proxy supplies the real token
    // ...
  }
  ```
- **Resolution precedence** (what URL actually gets called):
  1. `?proxy=<url>` query param on the page URL (runtime override),
  2. else the hardcoded `proxyUrl` in config,
  3. else a local dev proxy on `http://localhost:8787` (`serve.mjs`).
- The browser client POSTs an OpenAI-compatible body; when the proxy is used the **API key is
  empty/ignored** because the proxy injects the real token.

> ⚠️ War-Games' `proxyUrl` points at a **Cloudflare quick tunnel** (`trycloudflare.com`). Those
> URLs are **ephemeral** — they change whenever the tunnel restarts. For anything stable, deploy
> the proxy to a fixed `*.workers.dev` (Cloudflare Workers) or Azure URL instead.

## DropBoard wiring (already in this repo)

Same pattern, adapted:

1. **Set the proxy URL** in [`../web/config.js`](../web/config.js):
   ```js
   window.DROPBOARD_CONFIG = {
     AI_PROXY_URL: "https://YOUR-PROXY/v1/chat/completions", // <-- update this
     AI_MODEL: "openai/gpt-4o-mini",
     // ...
   };
   ```
2. **The client resolves the endpoint** with the same precedence in
   [`../web/src/lib/ai.js`](../web/src/lib/ai.js):
   `?proxy=` query param → `AI_PROXY_URL` → `http://localhost:8787/v1/chat/completions`.
   It sends **no Authorization header** — the proxy adds the token.
   ```js
   import { aiChat } from "./lib/ai.js";
   const data = await aiChat({ messages: [{ role: "user", content: "hi" }] });
   ```
3. **Allow this origin on the proxy** (proxy side — do *not* rebuild it). Add the Pages origin to
   the proxy's `ALLOWED_ORIGINS` env var:
   ```
   ALLOWED_ORIGINS = https://alx-du.github.io
   ```

That's the whole integration: one URL in config, one origin on the proxy.

## Verify

- **Runtime override / smoke test:** open the app with `?proxy=` pointed at a proxy, e.g.
  `https://alx-du.github.io/dropboard/?proxy=https://<sub>.trycloudflare.com/v1/chat/completions`.
- **Direct curl** (no key needed — the proxy injects it):
  ```bash
  curl -sS -X POST "https://YOUR-PROXY/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -d '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"Say hi in one word."}]}'
  ```
- If you get a **CORS error**, the Pages origin isn't in the proxy's `ALLOWED_ORIGINS`.
- If Live-AI **stops working** after previously working, the tunnel URL likely rotated — update
  `AI_PROXY_URL` (or pass a fresh `?proxy=`).

## Checklist to update later

- [ ] Replace `AI_PROXY_URL` in `web/config.js` with the real deployed proxy URL.
- [ ] Prefer a stable `*.workers.dev` URL over an ephemeral `trycloudflare.com` tunnel.
- [ ] Add `https://alx-du.github.io` to the proxy's `ALLOWED_ORIGINS`.
- [ ] (Optional) Pin `ALLOWED_MODELS` on the proxy for public deployments.
- [ ] Decide the first AI feature that will actually call `aiChat()` (currently deferred — see
  backlog #14 and PRODUCT_DESIGN.md §5).

## Notes

- **No key in the browser, ever.** The provider token lives only in the proxy's platform secret
  store. `apiKey`/Authorization from the browser is ignored by the proxy.
- **One proxy serves many apps.** The same deployed proxy can back DropBoard, War-Games, and any
  other Pages app — just add each origin to `ALLOWED_ORIGINS`.
- We are **not** copying War-Games' `serve.mjs` or game logic — only the configuration approach.
