// DropBoard front-end app. Backend-agnostic: everything goes through ./lib/backend.js, which
// is wired to Cloudflare or Supabase by DROPBOARD_CONFIG.BACKEND. Implements the core loop:
// create/join a board, drop text/links/files, see items live, end the session.
import * as backend from "./lib/backend.js";

// ctx carries what every backend call needs: { code, token, sessionId, role }
let ctx = null;
let disconnect = null;
const seen = new Set(); // item ids already rendered (dedupe snapshot + live)

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

function toast(msg, isError = false) {
  const t = $("toast");
  t.textContent = msg;
  t.className = isError ? "toast err" : "toast";
  t.hidden = false;
  setTimeout(() => { t.hidden = true; }, 3500);
}

function show(view) {
  $("landing").hidden = view !== "landing";
  $("board").hidden = view !== "board";
}

// --- Session entry -------------------------------------------------------
async function enter(promise, role) {
  try {
    const s = await promise;
    ctx = { code: s.access_code || s.session_id, token: s.session_token, sessionId: s.session_id, role: s.role_in_session || role };
    $("codeLabel").textContent = ctx.code;
    $("endBtn").hidden = ctx.role !== "creator";
    $("items").innerHTML = "";
    seen.clear();
    show("board");
    disconnect = backend.connect(ctx, onEvent);
  } catch (e) {
    toast(e.message || "Something went wrong", true);
  }
}

function onEvent(evt) {
  if (evt.type === "item" && evt.item) addItemToDom(evt.item);
  else if (evt.type === "snapshot") (evt.items || []).forEach(addItemToDom);
  else if (evt.type === "delete" && evt.item) $(`item-${evt.item.id}`)?.remove();
  else if (evt.type === "ended" || evt.type === "expired") {
    toast("This session has ended.");
    leave();
  }
}

// --- Rendering items -----------------------------------------------------
async function addItemToDom(item) {
  if (!item || seen.has(item.id)) return;
  seen.add(item.id);
  const li = document.createElement("li");
  li.id = `item-${item.id}`;
  li.className = "item";

  if (item.kind === "link") {
    const url = item.content.url || item.content;
    li.innerHTML = `<span class="ic">🔗</span><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`;
  } else if (item.kind === "text") {
    const text = item.content.text ?? item.content;
    li.innerHTML = `<span class="ic">📝</span><span class="txt">${esc(text)}</span><button class="copy">copy</button>`;
    li.querySelector(".copy").onclick = () => { navigator.clipboard.writeText(text); toast("Copied"); };
  } else if (item.kind === "file") {
    const { name, size, key } = item.content;
    li.innerHTML = `<span class="ic">📎</span><span class="txt">${esc(name)} <small>(${fmtSize(size)})</small></span><a class="dl" href="#">download</a>`;
    li.querySelector(".dl").onclick = async (e) => {
      e.preventDefault();
      try { window.open(await backend.fileUrl(ctx, key), "_blank"); }
      catch (err) { toast(err.message || "Download failed", true); }
    };
  }
  $("items").prepend(li);
}

function fmtSize(n) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// --- Dropping items ------------------------------------------------------
const looksLikeUrl = (s) => /^https?:\/\/\S+$/i.test(s.trim());

async function dropText() {
  const raw = $("composer").value.trim();
  if (!raw || !ctx) return;
  $("composer").value = "";
  const item = looksLikeUrl(raw) ? { kind: "link", content: { url: raw } } : { kind: "text", content: { text: raw } };
  try {
    const saved = await backend.addItem(ctx, item);
    addItemToDom(saved); // optimistic-ish; live event dedupes via seen set
  } catch (e) { toast(e.message || "Could not drop", true); }
}

async function dropFiles(files) {
  if (!ctx) return;
  for (const file of files) {
    try { const { item } = await backend.uploadFile(ctx, file); addItemToDom(item); }
    catch (e) { toast(`${file.name}: ${e.message || "upload failed"}`, true); }
  }
}

function leave() {
  if (disconnect) { disconnect(); disconnect = null; }
  ctx = null;
  show("landing");
}

// --- Wire up UI ----------------------------------------------------------
function init() {
  if (!backend.configured()) {
    toast(`Backend "${backend.backendName}" is not configured — edit web/config.js`, true);
  }

  $("createBtn").onclick = () => enter(backend.createSession(4), "creator");
  $("joinBtn").onclick = () => {
    const code = $("joinCode").value.trim().toUpperCase();
    if (code) enter(backend.joinSession(code), "participant");
  };
  $("joinCode").addEventListener("keydown", (e) => { if (e.key === "Enter") $("joinBtn").click(); });

  $("dropBtn").onclick = dropText;
  $("composer").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) dropText(); });
  $("fileInput").addEventListener("change", (e) => dropFiles(e.target.files));

  const dz = $("board");
  ["dragover", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => e.preventDefault()));
  dz.addEventListener("drop", (e) => { if (e.dataTransfer?.files?.length) dropFiles(e.dataTransfer.files); });
  // Paste-to-drop: files or text/links.
  document.addEventListener("paste", (e) => {
    if (!ctx || document.activeElement === $("composer")) return;
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) dropFiles(files);
  });

  $("endBtn").onclick = async () => {
    try { await backend.endSession(ctx); toast("Session ended"); leave(); }
    catch (e) { toast(e.message || "Could not end", true); }
  };
  $("leaveBtn").onclick = leave;
  $("copyCode").onclick = () => { navigator.clipboard.writeText(ctx.code); toast("Code copied"); };
}

init();
