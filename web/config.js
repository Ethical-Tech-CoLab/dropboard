// DropBoard runtime configuration.
//
// IMPORTANT: everything in this file is NON-SECRET and safe to ship to the browser.
//   - The Cloudflare backend URL and the Supabase anon key are public by design; access control
//     is enforced by per-session tokens + RLS/Durable-Object checks (docs/PRODUCT_DESIGN.md §4).
//   - The AI provider token is NEVER here — it lives only inside the pages-ai-proxy.
//
// Fill these in for your environment. See docs/PRODUCT_DESIGN.md and docs/BACKEND_OPTIONS.md.
window.DROPBOARD_CONFIG = {
  // --- Which backend the front end talks to ---
  // "cloudflare" (default/recommended) or "supabase". The pick-a-backend decision is tracked in
  // the GitHub issues; this is the single switch that wires the UI to one implementation.
  BACKEND: "cloudflare",

  // --- Cloudflare backend (Workers + Durable Objects + R2) — see cloudflare/ ---
  CF_BACKEND_URL: "https://dropboard-backend.YOUR-SUBDOMAIN.workers.dev",

  // --- Supabase backend (used when BACKEND === "supabase") — see supabase/ ---
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-PUBLIC-ANON-KEY",

  // --- AI proxy (wired, features deferred this iteration) ---
  // TEMPORARY (option A): reusing War-Games' live Cloudflare quick-tunnel proxy. This URL is
  // EPHEMERAL — it rotates whenever the tunnel restarts, and will then break. Swap in ETC's
  // stable proxy URL when available. See docs/quickstart-for-ai-proxy.md.
  AI_PROXY_URL: "https://rss-junior-ireland-scenes.trycloudflare.com/v1/chat/completions",
  AI_MODEL: "gpt-4o-mini", // matches the model War-Games sends to this same proxy
};
