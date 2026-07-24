// BoardRoom — one Durable Object instance per session (keyed by access code).
//
// Holds the room's ephemeral state (meta + items + participants) in DO storage, fans out live
// updates to connected WebSocket clients, and self-destructs on a TTL alarm. This is what makes
// Cloudflare a natural fit for DropBoard: the "room" IS the object, real-time is built in, and
// ephemerality is just the alarm wiping state — nothing lingers, no history.
//
// The Worker forwards internal routes here: /create /join /end /items /ws. File bytes live in
// R2 and are handled by the Worker; only their metadata becomes an item here.
import { Env, Item, Meta } from "./types";
import { mintToken, verifyToken, bearer } from "./token";

export class BoardRoom {
  private state: DurableObjectState;
  private env: Env;
  private sockets = new Set<WebSocket>();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  private async meta(): Promise<Meta | undefined> {
    return await this.state.storage.get<Meta>("meta");
  }
  private async items(): Promise<Item[]> {
    return (await this.state.storage.get<Item[]>("items")) ?? [];
  }

  // Reject unless the request carries a valid token for THIS room's code.
  private async authed(req: Request, code: string, requireCreator = false): Promise<boolean> {
    const token = bearer(req) ?? new URL(req.url).searchParams.get("token") ?? "";
    const payload = await verifyToken(this.env.SESSION_SECRET, token);
    if (!payload || payload.code !== code) return false;
    if (requireCreator && payload.role !== "creator") return false;
    return true;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    // Worker forwards as /<code>/<action>.
    const [, code, action] = url.pathname.split("/");

    switch (action) {
      case "create":
        return this.handleCreate(code, req);
      case "join":
        return this.handleJoin(code);
      case "end":
        return this.handleEnd(code, req);
      case "items":
        return req.method === "GET" ? this.handleList(code, req) : this.handleAddItem(code, req);
      case "ws":
        return this.handleWebSocket(code, req);
      default:
        return new Response("not found", { status: 404 });
    }
  }

  private async handleCreate(code: string, req: Request): Promise<Response> {
    const existing = await this.meta();
    const now = Date.now();
    if (existing && existing.status === "active" && new Date(existing.expires_at).getTime() > now) {
      return new Response(JSON.stringify({ error: "code in use" }), { status: 409 });
    }
    const body = (await req.json().catch(() => ({}))) as { ttl_hours?: number };
    const ttl = Math.min(24, Math.max(1, Math.floor(body?.ttl_hours ?? 4)));
    const expiresAt = new Date(now + ttl * 3600_000).toISOString();
    const meta: Meta = { code, created_at: new Date(now).toISOString(), expires_at: expiresAt, status: "active" };
    await this.state.storage.put("meta", meta);
    await this.state.storage.put("items", []);
    await this.state.storage.setAlarm(new Date(expiresAt)); // TTL cleanup

    const token = await mintToken(this.env.SESSION_SECRET, {
      code, role: "creator", exp: Math.floor(new Date(expiresAt).getTime() / 1000),
    });
    return Response.json({ session_id: code, access_code: code, session_token: token, expires_at: expiresAt, role_in_session: "creator" }, { status: 201 });
  }

  private async handleJoin(code: string): Promise<Response> {
    const meta = await this.meta();
    if (!meta) return Response.json({ error: "session not found" }, { status: 404 });
    if (meta.status !== "active" || new Date(meta.expires_at).getTime() <= Date.now()) {
      return Response.json({ error: "session has ended" }, { status: 410 });
    }
    const token = await mintToken(this.env.SESSION_SECRET, {
      code, role: "participant", exp: Math.floor(new Date(meta.expires_at).getTime() / 1000),
    });
    return Response.json({ session_id: code, session_token: token, expires_at: meta.expires_at, role_in_session: "participant" });
  }

  private async handleEnd(code: string, req: Request): Promise<Response> {
    if (!(await this.authed(req, code, true))) return Response.json({ error: "creator token required" }, { status: 403 });
    const meta = await this.meta();
    if (meta) {
      meta.status = "ended";
      await this.state.storage.put("meta", meta);
    }
    this.broadcast({ type: "ended" });
    await this.state.storage.setAlarm(new Date(Date.now() + 1000)); // clean up shortly
    return Response.json({ session_id: code, status: "ended" });
  }

  private async handleList(code: string, req: Request): Promise<Response> {
    if (!(await this.authed(req, code))) return Response.json({ error: "unauthorized" }, { status: 401 });
    return Response.json({ items: await this.items() });
  }

  private async handleAddItem(code: string, req: Request): Promise<Response> {
    if (!(await this.authed(req, code))) return Response.json({ error: "unauthorized" }, { status: 401 });
    const body = (await req.json().catch(() => null)) as { kind?: string; content?: unknown; created_by?: string } | null;
    if (!body || !["text", "link", "file"].includes(body.kind ?? "")) {
      return Response.json({ error: "invalid item" }, { status: 400 });
    }
    const item: Item = {
      id: crypto.randomUUID(),
      kind: body.kind as Item["kind"],
      content: body.content,
      created_at: new Date().toISOString(),
      created_by: body.created_by,
    };
    const items = await this.items();
    items.push(item);
    await this.state.storage.put("items", items);
    this.broadcast({ type: "item", item });
    return Response.json(item, { status: 201 });
  }

  private async handleWebSocket(code: string, req: Request): Promise<Response> {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("expected websocket", { status: 426 });
    // Browsers can't set Authorization on WebSocket, so the token comes via ?token=.
    if (!(await this.authed(req, code))) return new Response("unauthorized", { status: 401 });

    const pair = new WebSocketPair();
    const server = pair[1];
    server.accept();
    this.sockets.add(server);
    server.send(JSON.stringify({ type: "snapshot", items: await this.items() }));
    server.addEventListener("close", () => this.sockets.delete(server));
    server.addEventListener("error", () => this.sockets.delete(server));
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  private broadcast(msg: unknown): void {
    const data = JSON.stringify(msg);
    for (const ws of this.sockets) {
      try { ws.send(data); } catch { this.sockets.delete(ws); }
    }
  }

  // TTL / manual-end cleanup: wipe R2 objects for this room, then all DO state. Ephemerality.
  async alarm(): Promise<void> {
    const meta = await this.meta();
    const code = meta?.code;
    if (code) {
      const listed = await this.env.DROPS.list({ prefix: `${code}/` });
      if (listed.objects.length) {
        await this.env.DROPS.delete(listed.objects.map((o) => o.key));
      }
    }
    this.broadcast({ type: "expired" });
    for (const ws of this.sockets) { try { ws.close(1000, "session ended"); } catch { /* ignore */ } }
    this.sockets.clear();
    await this.state.storage.deleteAll();
  }
}
