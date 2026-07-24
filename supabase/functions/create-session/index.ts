// POST /functions/v1/create-session
// Body (optional): { "ttl_hours": number }   // clamped to [1, 24], default 4
// Returns: { session_id, access_code, session_token, expires_at, role_in_session: "creator" }
//
// Public endpoint (no session token yet). Creates the board with the service role and mints a
// creator-scoped session JWT for the caller. See docs/PRODUCT_DESIGN.md §2.3, §4.
import { adminClient } from "../_shared/admin.ts";
import { mintSessionToken } from "../_shared/jwt.ts";
import { makeAccessCode } from "../_shared/codes.ts";
import { json, preflight } from "../_shared/http.ts";

const DEFAULT_TTL_HOURS = 4;
const MAX_TTL_HOURS = 24;
const CODE_RETRIES = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let ttlHours = DEFAULT_TTL_HOURS;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.ttl_hours === "number") {
      ttlHours = Math.min(MAX_TTL_HOURS, Math.max(1, Math.floor(body.ttl_hours)));
    }
  } catch { /* empty body is fine */ }

  const expiresAt = new Date(Date.now() + ttlHours * 3600_000).toISOString();
  const db = adminClient();

  // Insert with a fresh code, retrying on the rare unique-code collision.
  for (let attempt = 0; attempt < CODE_RETRIES; attempt++) {
    const access_code = makeAccessCode();
    const { data, error } = await db
      .from("sessions")
      .insert({ access_code, expires_at: expiresAt })
      .select("id, access_code, expires_at")
      .single();

    if (!error && data) {
      const token = await mintSessionToken(data.id, "creator", data.expires_at);
      return json({
        session_id: data.id,
        access_code: data.access_code,
        session_token: token,
        expires_at: data.expires_at,
        role_in_session: "creator",
      }, 201);
    }
    // 23505 = unique_violation on access_code -> try another code.
    if (error && (error as { code?: string }).code !== "23505") {
      console.error("create-session insert error", error);
      return json({ error: "could not create session" }, 500);
    }
  }
  return json({ error: "could not allocate an access code, try again" }, 503);
});
