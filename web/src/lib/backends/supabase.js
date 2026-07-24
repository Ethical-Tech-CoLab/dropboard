// Supabase backend adapter — maps the backend-agnostic interface used by app.js onto the
// Supabase client + Edge Functions (see ../session.js, ../supabase.js and ../../../supabase/).
//
// NOTE: wired but not browser-verified yet — exercise it after the Supabase project is deployed
// (backlog #2/#3). The Cloudflare adapter is the tested default.
import { createSession as fnCreate, joinSession as fnJoin, endSession as fnEnd, subscribeToItems } from "../session.js";
import { sessionClient } from "../supabase.js";

const BUCKET = "drops";

// NOTE: custom access codes need matching support in the create-session Edge Function;
// for now the Supabase path ignores accessCode and always returns a generated code.
export const createSession = (ttlHours = 4, _accessCode) => fnCreate(ttlHours);
export const joinSession = (code) => fnJoin(code);
export const endSession = ({ token }) => fnEnd(token);

export async function addItem({ token, sessionId }, item) {
  const client = sessionClient(token);
  const { data, error } = await client
    .from("items")
    .insert({ session_id: sessionId, kind: item.kind, content: item.content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadFile({ token, sessionId }, file) {
  const client = sessionClient(token);
  const key = `${crypto.randomUUID()}-${file.name}`;
  const path = `${sessionId}/${key}`;
  const { error: upErr } = await client.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
  });
  if (upErr) throw upErr;
  const item = await addItem({ token, sessionId }, {
    kind: "file",
    content: { name: file.name, size: file.size, key },
  });
  return { key, item };
}

export async function fileUrl({ token, sessionId }, key) {
  const client = sessionClient(token);
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(`${sessionId}/${key}`, 300);
  if (error) throw error;
  return data.signedUrl;
}

// Maps Realtime events onto the app's event shape. Returns a disconnect function.
export function connect({ token, sessionId }, onEvent) {
  const unsubPromise = subscribeToItems(token, sessionId, (evt, item) => {
    if (evt === "INSERT") onEvent({ type: "item", item });
    else if (evt === "DELETE") onEvent({ type: "delete", item });
  });
  return () => { unsubPromise.then((unsub) => unsub && unsub()).catch(() => {}); };
}

export function configured() {
  const cfg = window.DROPBOARD_CONFIG || {};
  return Boolean(cfg.SUPABASE_URL) && !cfg.SUPABASE_URL.includes("YOUR-PROJECT");
}
