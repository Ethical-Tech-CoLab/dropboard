// POST /functions/v1/end-session
// Header: Authorization: Bearer <session_token>   // must be a CREATOR token
// Returns: { session_id, status: "ended", ended_at }
//
// Manual end (docs/PRODUCT_DESIGN.md §4.5). Only the creator may end. We verify the session
// JWT server-side and act on its own session_id claim — the client cannot end a session it
// didn't create. Storage/rows are removed later by the scheduled `cleanup` function.
import { adminClient } from "../_shared/admin.ts";
import { verifySessionToken, bearer } from "../_shared/jwt.ts";
import { json, preflight } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const token = bearer(req);
  if (!token) return json({ error: "missing session token" }, 401);

  let claims;
  try {
    claims = await verifySessionToken(token);
  } catch {
    return json({ error: "invalid or expired token" }, 401);
  }
  if (claims.role_in_session !== "creator") {
    return json({ error: "only the session creator can end it" }, 403);
  }

  const endedAt = new Date().toISOString();
  const db = adminClient();
  const { data, error } = await db
    .from("sessions")
    .update({ status: "ended", ended_at: endedAt })
    .eq("id", claims.session_id)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("end-session update error", error);
    return json({ error: "could not end session" }, 500);
  }
  // Idempotent: already ended/expired is still success.
  return json({ session_id: claims.session_id, status: "ended", ended_at: data ? endedAt : null });
});
