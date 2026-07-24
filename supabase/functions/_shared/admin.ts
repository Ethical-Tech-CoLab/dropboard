// Service-role Supabase client for Edge Functions. Bypasses RLS — server-side only, never
// expose the service_role key to the browser. SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are
// auto-injected into the function runtime.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
