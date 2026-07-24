// DropBoard — GitHub-storage PROTOTYPE (proof of concept, not the product).
//
// A tiny zero-dependency Node proxy that holds a GitHub token server-side and stores a board as
// a SECRET GIST (board.json). This exists to demonstrate the option analyzed in
// ../../docs/BACKEND_OPTIONS.md — and its limits. Text/links only, small, no realtime (the demo
// polls), and content persists in gist history. Do NOT use for real/ephemeral/private data.
//
// Run:  GITHUB_TOKEN=ghp_xxx node server.mjs   (token needs the `gist` scope)
// Then open demo.html (it points at http://localhost:8799).
import { createServer } from "node:http";

const TOKEN = process.env.GITHUB_TOKEN;
const PORT = Number(process.env.PORT || 8799);
const MAX_ITEM_BYTES = 8 * 1024; // keep items small — this is the Contents/Gists sweet spot
const MAX_ITEMS = 200;

if (!TOKEN) {
  console.error("Set GITHUB_TOKEN (a token with the 'gist' scope). Aborting.");
  process.exit(1);
}

const GH = "https://api.github.com";
const ghHeaders = {
  "Authorization": `Bearer ${TOKEN}`,
  "Accept": "application/vnd.github+json",
  "User-Agent": "dropboard-github-store-prototype",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function send(res, status, body) {
  res.writeHead(status, { ...CORS, "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString() || "{}"); } catch { return null; }
}

// --- Gist helpers ---------------------------------------------------------
async function createBoard() {
  const res = await fetch(`${GH}/gists`, {
    method: "POST",
    headers: ghHeaders,
    body: JSON.stringify({
      description: "DropBoard prototype board (ephemeral demo)",
      public: false,
      files: { "board.json": { content: JSON.stringify({ items: [] }, null, 2) } },
    }),
  });
  if (!res.ok) throw new Error(`gist create failed: ${res.status}`);
  const gist = await res.json();
  return gist.id;
}

async function readBoard(id) {
  const res = await fetch(`${GH}/gists/${id}`, { headers: ghHeaders });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`gist read failed: ${res.status}`);
  const gist = await res.json();
  const file = gist.files?.["board.json"];
  if (!file) return { items: [] };
  try { return JSON.parse(file.content ?? "{}"); } catch { return { items: [] }; }
}

async function writeBoard(id, board) {
  const res = await fetch(`${GH}/gists/${id}`, {
    method: "PATCH",
    headers: ghHeaders,
    body: JSON.stringify({ files: { "board.json": { content: JSON.stringify(board, null, 2) } } }),
  });
  if (!res.ok) throw new Error(`gist update failed: ${res.status}`);
}

// --- Routing --------------------------------------------------------------
const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split("/").filter(Boolean); // ["board", id?, "items"?]

  try {
    // POST /board -> create a board (gist)
    if (parts[0] === "board" && parts.length === 1 && req.method === "POST") {
      const id = await createBoard();
      return send(res, 201, { board_id: id });
    }

    const id = parts[1];
    if (parts[0] === "board" && id) {
      // GET /board/:id -> items
      if (parts.length === 2 && req.method === "GET") {
        const board = await readBoard(id);
        if (!board) return send(res, 404, { error: "board not found" });
        return send(res, 200, board);
      }
      // POST /board/:id/items -> append a text/link item (read-modify-write)
      if (parts[2] === "items" && req.method === "POST") {
        const body = await readJson(req);
        const kind = body?.kind;
        if (!["text", "link"].includes(kind)) return send(res, 400, { error: "kind must be text or link" });
        if (JSON.stringify(body.content ?? "").length > MAX_ITEM_BYTES) {
          return send(res, 413, { error: "item too large for this prototype" });
        }
        const board = await readBoard(id);
        if (!board) return send(res, 404, { error: "board not found" });
        if ((board.items?.length ?? 0) >= MAX_ITEMS) return send(res, 507, { error: "board full" });
        const item = { id: crypto.randomUUID(), kind, content: body.content, created_at: new Date().toISOString() };
        board.items = [...(board.items ?? []), item];
        await writeBoard(id, board); // NOTE: last-writer-wins; concurrent adds can be lost (see README)
        return send(res, 201, item);
      }
    }
    return send(res, 404, { error: "not found" });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: String(err.message || err) });
  }
});

server.listen(PORT, () => console.log(`github-store prototype on http://localhost:${PORT}`));
