// DropBoard backend — Cloudflare Worker entry.
//
// Routes:
//   POST   /sessions                     create a board (returns access_code + creator token)
//   POST   /sessions/:code/join          join by code (returns participant token)
//   POST   /sessions/:code/end           end a board (creator token)
//   GET    /sessions/:code/items         list items (token)
//   POST   /sessions/:code/items         add a text/link item (token)
//   GET    /sessions/:code/ws?token=...  WebSocket for live updates (token)
//   POST   /sessions/:code/files         upload a file to R2 + register item (token)
//   GET    /sessions/:code/files/:key    download a file from R2 (token)
//
// State + realtime live in the BoardRoom Durable Object (keyed by code). File BYTES live in R2
// and are handled here; their metadata is registered as an item in the room.
import { Env } from "./types";
import { BoardRoom } from "./board-room";
import { makeAccessCode, json, corsHeaders } from "./util";
import { verifyToken, bearer } from "./token";

export { BoardRoom };

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN || "*";
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });

    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean); // ["sessions", code?, action?, key?]
    if (parts[0] !== "sessions") return json({ error: "not found" }, 404, origin);

    // POST /sessions -> create a board.
    // Body may include an optional custom `access_code`; otherwise a random one is generated.
    if (parts.length === 1 && req.method === "POST") {
      const bodyText = await req.text();
      let body: { access_code?: unknown } = {};
      try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { body = {}; }
      const custom = typeof body.access_code === "string" ? body.access_code.trim().toUpperCase() : "";

      if (custom) {
        // 6–24 chars, letters/digits/hyphens, no leading/trailing hyphen.
        if (!/^[A-Z0-9](?:[A-Z0-9-]{4,22})[A-Z0-9]$/.test(custom)) {
          return json({ error: "code must be 6–24 characters: letters, numbers, or hyphens" }, 400, origin);
        }
        const room = env.BOARDS.get(env.BOARDS.idFromName(custom));
        const res = await room.fetch(new Request(`https://do/${custom}/create`, { method: "POST", body: bodyText }));
        if (res.status === 409) return json({ error: "that code is already in use — try another" }, 409, origin);
        return withCors(res, origin);
      }

      // Random code, retrying on the rare collision.
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = makeAccessCode();
        const room = env.BOARDS.get(env.BOARDS.idFromName(code));
        const res = await room.fetch(new Request(`https://do/${code}/create`, { method: "POST", body: bodyText || "{}" }));
        if (res.status !== 409) return withCors(res, origin);
      }
      return json({ error: "could not allocate an access code, try again" }, 503, origin);
    }

    const code = parts[1];
    const action = parts[2];
    if (!code) return json({ error: "not found" }, 404, origin);
    const room = env.BOARDS.get(env.BOARDS.idFromName(code));

    // File routes are handled here (R2); everything else forwards to the room.
    if (action === "files") {
      return handleFiles(parts, req, env, room, code, origin);
    }

    const forwardPath = action === "ws" ? `${code}/ws?${url.searchParams.toString()}` : `${code}/${action}`;
    const res = await room.fetch(new Request(`https://do/${forwardPath}`, req));
    return withCors(res, origin);
  },
};

async function handleFiles(
  parts: string[], req: Request, env: Env, room: DurableObjectStub, code: string, origin: string,
): Promise<Response> {
  const token = bearer(req) ?? new URL(req.url).searchParams.get("token") ?? "";
  const payload = await verifyToken(env.SESSION_SECRET, token);
  if (!payload || payload.code !== code) return json({ error: "unauthorized" }, 401, origin);

  // GET /sessions/:code/files/:key -> download
  if (req.method === "GET" && parts[3]) {
    const key = `${code}/${decodeURIComponent(parts[3])}`;
    const obj = await env.DROPS.get(key);
    if (!obj) return json({ error: "not found" }, 404, origin);
    return new Response(obj.body, {
      headers: { ...corsHeaders(origin), "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream" },
    });
  }

  // POST /sessions/:code/files -> upload (filename + content-type via headers)
  if (req.method === "POST") {
    const max = Number(env.MAX_FILE_BYTES || "26214400");
    const size = Number(req.headers.get("Content-Length") || "0");
    if (size > max) return json({ error: `file too large (max ${max} bytes)` }, 413, origin);

    const name = req.headers.get("X-File-Name") || "file";
    const key = `${code}/${crypto.randomUUID()}-${name}`;
    await env.DROPS.put(key, req.body, {
      httpMetadata: { contentType: req.headers.get("Content-Type") || "application/octet-stream" },
    });
    // Register the file as an item in the room so it syncs to everyone.
    const itemRes = await room.fetch(new Request(`https://do/${code}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ kind: "file", content: { name, size, key: key.slice(code.length + 1) } }),
    }));
    const item = await itemRes.json();
    return json({ key: key.slice(code.length + 1), item }, 201, origin);
  }

  return json({ error: "method not allowed" }, 405, origin);
}

// Re-attach CORS to a Durable Object response (WebSocket 101 responses pass through untouched).
function withCors(res: Response, origin: string): Response {
  if (res.status === 101) return res;
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin))) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}
