// Shared types for the Cloudflare backend.

export interface Env {
  BOARDS: DurableObjectNamespace;
  DROPS: R2Bucket;
  SESSION_SECRET: string;
  ALLOWED_ORIGIN: string;
  MAX_FILE_BYTES: string;
}

export type ItemKind = "text" | "link" | "file";

export interface Item {
  id: string;
  kind: ItemKind;
  content: unknown; // {text} | {url,title,favicon} | {name,size,key}
  created_at: string;
  created_by?: string;
}

export interface Meta {
  code: string;
  created_at: string;
  expires_at: string;
  status: "active" | "ended" | "expired";
}
