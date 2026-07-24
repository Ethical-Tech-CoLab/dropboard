// Thin client for the pages-ai-proxy — an OpenAI-compatible chat-completions call with the
// base URL swapped to the proxy. The proxy injects the provider token server-side, so we send
// NO real API key from the browser.
//
// Config-only reuse of the proxy (see docs/quickstart-for-ai-proxy.md), mirroring War-Games'
// resolution precedence:
//   1. ?proxy=<url>            runtime override in the page URL (handy for testing a new tunnel)
//   2. DROPBOARD_CONFIG.AI_PROXY_URL   the deployed proxy in web/config.js
//   3. http://localhost:8787/v1/chat/completions   local dev proxy fallback
//
// Status: wired and ready, but no DropBoard feature calls this yet (AI deferred). See
// docs/PRODUCT_DESIGN.md §5.

const LOCAL_DEV_PROXY = "http://localhost:8787/v1/chat/completions";

/** Resolve the proxy endpoint using the War-Games precedence (query param > config > local). */
export function resolveProxyUrl() {
  const fromQuery = new URLSearchParams(location.search).get("proxy");
  if (fromQuery) return fromQuery;
  const cfg = window.DROPBOARD_CONFIG || {};
  if (cfg.AI_PROXY_URL && !cfg.AI_PROXY_URL.includes("YOUR-PROXY")) return cfg.AI_PROXY_URL;
  return LOCAL_DEV_PROXY;
}

/**
 * Send a chat-completion request through the pages-ai-proxy.
 * @param {{ messages: Array<{role:string, content:string}>, model?: string, signal?: AbortSignal }} opts
 * @returns {Promise<object>} the OpenAI-style response JSON
 */
export async function aiChat({ messages, model, signal } = {}) {
  const cfg = window.DROPBOARD_CONFIG || {};
  const res = await fetch(resolveProxyUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // no Authorization — the proxy adds the real token
    body: JSON.stringify({ model: model || cfg.AI_MODEL, messages }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`AI proxy error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
