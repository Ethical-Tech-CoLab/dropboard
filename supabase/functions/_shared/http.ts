// Shared HTTP helpers: CORS + JSON responses.
// In production, set ALLOWED_ORIGIN to the exact Pages origin (e.g. https://ethical-tech-colab.github.io).

const ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

export function preflight(): Response {
  return new Response("ok", { headers: corsHeaders });
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
