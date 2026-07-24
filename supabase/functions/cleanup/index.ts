// POST /functions/v1/cleanup
// Header: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>   // trusted callers only
// Returns: { sessions_deleted, objects_deleted }
//
// Authoritative ephemeral cleanup (docs/PRODUCT_DESIGN.md §4.5): for every expired or ended
// session, delete its Storage objects FIRST (SQL can't), then the session row (items and
// participants cascade). Idempotent / retry-safe. Schedule this via cron — see
// supabase/README.md. Not exposed to the browser; rejects anything but the service-role key.
import { adminClient } from "../_shared/admin.ts";
import { json, preflight } from "../_shared/http.ts";
import { bearer } from "../_shared/jwt.ts";

const BUCKET = "drops";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // Only trusted schedulers (holding the service-role key) may trigger cleanup.
  if (bearer(req) !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    return json({ error: "forbidden" }, 403);
  }

  const db = adminClient();
  const nowISO = new Date().toISOString();

  const { data: finished, error } = await db
    .from("sessions")
    .select("id")
    .or(`expires_at.lt.${nowISO},status.in.(ended,expired)`);

  if (error) {
    console.error("cleanup select error", error);
    return json({ error: "cleanup failed" }, 500);
  }

  let objectsDeleted = 0;
  let sessionsDeleted = 0;

  for (const { id } of finished ?? []) {
    // 1. Delete all objects under <session_id>/ (single-level convention, no recursion needed).
    const { data: files } = await db.storage.from(BUCKET).list(id, { limit: 1000 });
    if (files && files.length) {
      const paths = files.map((f) => `${id}/${f.name}`);
      const { error: rmErr } = await db.storage.from(BUCKET).remove(paths);
      if (rmErr) {
        // Leave the row for the next run rather than orphaning storage.
        console.error("cleanup storage remove error", id, rmErr);
        continue;
      }
      objectsDeleted += paths.length;
    }
    // 2. Delete the session row (items/participants cascade).
    const { error: delErr } = await db.from("sessions").delete().eq("id", id);
    if (delErr) {
      console.error("cleanup row delete error", id, delErr);
      continue;
    }
    sessionsDeleted++;
  }

  return json({ sessions_deleted: sessionsDeleted, objects_deleted: objectsDeleted });
});
