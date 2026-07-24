// Cloudflare backend client (Workers + Durable Objects + R2). Reads CF_BACKEND_URL from
// window.DROPBOARD_CONFIG. Exposes the backend-agnostic interface consumed by app.js.
const cfg = window.DROPBOARD_CONFIG || {};
const BASE = (cfg.CF_BACKEND_URL || "").replace(/\/$/, "");

async function call(path, { method = "POST", token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body && JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${path} failed (${res.status})`);
  return data;
}

export function createSession(ttlHours = 4) {
  return call("/sessions", { body: { ttl_hours: ttlHours } });
}

export function joinSession(code) {
  return call(`/sessions/${encodeURIComponent(code)}/join`, { body: {} });
}

export function endSession({ code, token }) {
  return call(`/sessions/${encodeURIComponent(code)}/end`, { token });
}

export function addItem({ code, token }, item) {
  return call(`/sessions/${encodeURIComponent(code)}/items`, { token, body: item });
}

export async function uploadFile({ code, token }, file) {
  const res = await fetch(`${BASE}/sessions/${encodeURIComponent(code)}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-File-Name": file.name,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "upload failed");
  return data; // { key, item }
}

export function fileUrl({ code, token }, key) {
  return `${BASE}/sessions/${encodeURIComponent(code)}/files/${encodeURIComponent(key)}?token=${encodeURIComponent(token)}`;
}

// Live updates via WebSocket. onEvent receives {type:'snapshot'|'item'|'ended'|'expired', ...}.
// Returns a disconnect function.
export function connect({ code, token }, onEvent) {
  const wsBase = BASE.replace(/^http/, "ws");
  const ws = new WebSocket(`${wsBase}/sessions/${encodeURIComponent(code)}/ws?token=${encodeURIComponent(token)}`);
  ws.addEventListener("message", (e) => {
    try { onEvent(JSON.parse(e.data)); } catch { /* ignore malformed */ }
  });
  return () => { try { ws.close(); } catch { /* ignore */ } };
}

export function configured() {
  return Boolean(BASE) && !BASE.includes("YOUR-SUBDOMAIN");
}
