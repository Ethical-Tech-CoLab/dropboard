// Backend selector. Loads the implementation named by DROPBOARD_CONFIG.BACKEND
// ("cloudflare" default, or "supabase") and re-exports the backend-agnostic interface that
// app.js consumes: createSession, joinSession, endSession, addItem, uploadFile, fileUrl,
// connect, configured. Switching backends is a one-line change in web/config.js.
const cfg = window.DROPBOARD_CONFIG || {};

const impl = cfg.BACKEND === "supabase"
  ? await import("./backends/supabase.js")
  : await import("./backends/cloudflare.js");

export const {
  createSession,
  joinSession,
  endSession,
  addItem,
  uploadFile,
  fileUrl,
  connect,
  configured,
} = impl;

export const backendName = cfg.BACKEND || "cloudflare";
