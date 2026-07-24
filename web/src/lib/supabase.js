// Supabase client helpers for the browser.
//
// Two clients:
//   anonClient    — public anon key only; used to call the public Edge Functions.
//   sessionClient(token) — the anon key PLUS the minted per-session JWT in the Authorization
//                          header, so DB / Realtime / Storage calls run under RLS scoped to
//                          this session (docs/PRODUCT_DESIGN.md §4.2).
//
// Loaded from the ESM CDN to keep the scaffold build-free. When the front end moves to a
// bundler (backlog #1), switch to `import { createClient } from '@supabase/supabase-js'`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.DROPBOARD_CONFIG || {};

export function functionsBase() {
  return `${cfg.SUPABASE_URL}/functions/v1`;
}

export const anonClient = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function sessionClient(sessionToken) {
  const client = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${sessionToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Realtime authorizes over its own channel — hand it the same token.
  client.realtime.setAuth(sessionToken);
  return client;
}
