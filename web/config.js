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
  // Point at your already-deployed pages-ai-proxy; add this app's origin to its ALLOWED_ORIGINS.
  AI_PROXY_URL: "https://YOUR-PROXY/v1/chat/completions",
  AI_MODEL: "openai/gpt-4o-mini",
};
