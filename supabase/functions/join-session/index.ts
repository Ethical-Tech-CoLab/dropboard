// POST /functions/v1/join-session
// Body: { "access_code": string, "display_name"?: string }
// Returns: { session_id, session_token, expires_at, role_in_session: "participant" }
//
// Public endpoint. Validates the code with the service role and mints a participant-scoped
// session JWT. Returns 404 for an unknown code and 410 for an ended/expired one — but keep the
// bodies vague to avoid leaking which codes exist. See docs/PRODUCT_DESIGN.md §4.7 on rate
// limiting join attempts (configure at the platform/gateway layer).
import { adminClient } from "../_shared/admin.ts";
import { mintSessionToken } from "../_shared/jwt.ts";
import { json, preflight } from "../_shared/http.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const accessCode = typeof body?.access_code === "string" ? body.access_code.trim().toUpperCase() : "";
  const displayName = typeof body?.display_name === "string" ? body.display_name.slice(0, 60) : null;
  if (!accessCode) return json({ error: "access_code required" }, 400);

  const db = adminClient();
  const { data: session, error } = await db
    .from("sessions")
    .select("id, status, expires_at")
    .eq("access_code", accessCode)
    .maybeSingle();

  if (error) {
    console.error("join-session lookup error", error);
    return json({ error: "could not join" }, 500);
  }
  if (!session) return json({ error: "session not found" }, 404);

  const expired = session.status !== "active" || new Date(session.expires_at) <= new Date();
  if (expired) return json({ error: "session has ended" }, 410);

  // Best-effort participant record (attribution/presence). Don't fail the join on error.
  if (displayName) {
    await db.from("participants").insert({ session_id: session.id, display_name: displayName });
  }

  const token = await mintSessionToken(session.id, "participant", session.expires_at);
  return json({
    session_id: session.id,
    session_token: token,
    expires_at: session.expires_at,
    role_in_session: "participant",
  });
});
