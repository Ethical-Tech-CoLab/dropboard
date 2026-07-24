// Thin client for the pages-ai-proxy — an OpenAI-compatible chat-completions call with the
// base URL swapped to the proxy. The proxy injects the provider token server-side, so we send
// NO Authorization header.
//
// Status: wired and ready, but no DropBoard feature calls this yet (AI deferred this
// iteration). See docs/PRODUCT_DESIGN.md §5.

/**
 * Send a chat-completion request through the pages-ai-proxy.
 * @param {{ messages: Array<{role:string, content:string}>, model?: string, signal?: AbortSignal }} opts
 * @returns {Promise<object>} the OpenAI-style response JSON
 */
export async function aiChat({ messages, model, signal } = {}) {
  const cfg = window.DROPBOARD_CONFIG || {};
  if (!cfg.AI_PROXY_URL || cfg.AI_PROXY_URL.includes("YOUR-PROXY")) {
    throw new Error("AI_PROXY_URL is not configured in web/config.js");
  }
  const res = await fetch(cfg.AI_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // no Authorization — proxy adds it
    body: JSON.stringify({ model: model || cfg.AI_MODEL, messages }),
    signal,
  });
  if (!res.ok) {
    throw new Error(`AI proxy error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
