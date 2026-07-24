// DropBoard runtime configuration.
//
// IMPORTANT: everything in this file is NON-SECRET and safe to ship to the browser.
//   - The Supabase anon key is public by design; access control is enforced by RLS
//     + short-lived per-session JWTs (see docs/PRODUCT_DESIGN.md §4.2).
//   - The AI provider token is NEVER here — it lives only inside the pages-ai-proxy.
//
// Fill these in for your environment. See docs/PRODUCT_DESIGN.md §5 and §6.
window.DROPBOARD_CONFIG = {
  // --- AI proxy (wired, features deferred this iteration) ---
  // Point this at your already-deployed pages-ai-proxy. Do NOT rebuild the proxy.
  // Remember to add this app's origin (e.g. https://<owner>.github.io) to the proxy's
  // ALLOWED_ORIGINS env var.
  AI_PROXY_URL: "https://YOUR-PROXY/v1/chat/completions",
  AI_MODEL: "openai/gpt-4o-mini",

  // --- Supabase (BaaS backend) ---
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-PUBLIC-ANON-KEY",
};
