// Minimal browser client for the DropBoard Cloudflare backend.
// Drop-in shaped like web/src/lib/session.js so the front end can switch backends with little
// change. Set BASE to your deployed Worker URL.

const BASE = window.DROPBOARD_CONFIG?.CF_BACKEND_URL || "https://dropboard-backend.<subdomain>.workers.dev";

async function call(path, { method = "POST", token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body && JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${path} failed (${res.status})`);
  return data;
}

// -> { session_id, access_code, session_token, expires_at }
export const createSession = (ttlHours = 4) => call("/sessions", { body: { ttl_hours: ttlHours } });

// -> { session_id, session_token, expires_at }
export const joinSession = (code) => call(`/sessions/${encodeURIComponent(code)}/join`, { body: {} });

export const endSession = (code, token) => call(`/sessions/${encodeURIComponent(code)}/end`, { token });

export const addItem = (code, token, item) =>
  call(`/sessions/${encodeURIComponent(code)}/items`, { token, body: item });

// Live updates. onMessage receives {type:'snapshot'|'item'|'ended'|'expired', ...}.
export function connect(code, token, onMessage) {
  const ws = new WebSocket(`${BASE.replace(/^http/, "ws")}/sessions/${encodeURIComponent(code)}/ws?token=${encodeURIComponent(token)}`);
  ws.addEventListener("message", (e) => onMessage(JSON.parse(e.data)));
  return ws;
}

// Upload a File/Blob; returns { key, item }.
export async function uploadFile(code, token, file) {
  const res = await fetch(`${BASE}/sessions/${encodeURIComponent(code)}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "X-File-Name": file.name, "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "upload failed");
  return data;
}

export const fileUrl = (code, token, key) =>
  `${BASE}/sessions/${encodeURIComponent(code)}/files/${encodeURIComponent(key)}?token=${encodeURIComponent(token)}`;
