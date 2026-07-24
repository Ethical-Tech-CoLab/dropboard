// Per-session JWT minting/verification (docs/PRODUCT_DESIGN.md §4.2).
//
// Tokens are signed HS256 with the project's JWT secret (env JWT_SECRET), so the Supabase
// API (PostgREST/Realtime/Storage) verifies them natively. Claims:
//   role: "authenticated"  -> PostgREST runs as the authenticated role, RLS applies
//   aud:  "authenticated"
//   session_id             -> the only thing RLS policies key on
//   role_in_session        -> "creator" | "participant" (creator may end the session)
//   exp                    -> aligned to the session's expires_at
import { create, verify } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

let cachedKey: CryptoKey | null = null;

async function signingKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) throw new Error("JWT_SECRET is not set (supabase secrets set JWT_SECRET=...)");
  cachedKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return cachedKey;
}

export type SessionRole = "creator" | "participant";

export interface SessionClaims {
  session_id: string;
  role_in_session: SessionRole;
  role: string;
  aud: string;
  exp: number;
  sub: string;
  [k: string]: unknown;
}

export async function mintSessionToken(
  sessionId: string,
  roleInSession: SessionRole,
  expiresAtISO: string,
): Promise<string> {
  const key = await signingKey();
  const exp = Math.floor(new Date(expiresAtISO).getTime() / 1000);
  return await create(
    { alg: "HS256", typ: "JWT" },
    {
      aud: "authenticated",
      role: "authenticated",
      sub: crypto.randomUUID(),
      session_id: sessionId,
      role_in_session: roleInSession,
      iat: Math.floor(Date.now() / 1000),
      exp,
    },
    key,
  );
}

export async function verifySessionToken(token: string): Promise<SessionClaims> {
  const key = await signingKey();
  return (await verify(token, key)) as unknown as SessionClaims;
}

export function bearer(req: Request): string | null {
  const h = req.headers.get("Authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}
