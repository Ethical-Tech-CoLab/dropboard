// Session flows (backlog #3): create / join / end a board, and subscribe to its items in real
// time. Each returns the minted session token; hold it and pass it to sessionClient() for all
// board reads/writes.
import { functionsBase, sessionClient } from "./supabase.js";

async function callFn(name, body) {
  const res = await fetch(`${functionsBase()}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${name} failed (${res.status})`);
  return data;
}

// -> { session_id, access_code, session_token, expires_at, role_in_session: "creator" }
export function createSession(ttlHours = 4) {
  return callFn("create-session", { ttl_hours: ttlHours });
}

// -> { session_id, session_token, expires_at, role_in_session: "participant" }
export function joinSession(accessCode, displayName) {
  return callFn("join-session", { access_code: accessCode, display_name: displayName });
}

// Creator only; pass the creator's session_token.
export async function endSession(sessionToken) {
  const res = await fetch(`${functionsBase()}/end-session`, {
    method: "POST",
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `end-session failed (${res.status})`);
  return data;
}

// Load current items and subscribe to live changes for this session.
// onChange receives ('INSERT'|'UPDATE'|'DELETE', item). Returns an unsubscribe function.
export async function subscribeToItems(sessionToken, sessionId, onChange) {
  const client = sessionClient(sessionToken);

  const { data: initial, error } = await client
    .from("items")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  for (const item of initial ?? []) onChange("INSERT", item);

  const channel = client
    .channel(`items:${sessionId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "items", filter: `session_id=eq.${sessionId}` },
      (payload) => onChange(payload.eventType, payload.new ?? payload.old),
    )
    .subscribe();

  return () => { client.removeChannel(channel); };
}
