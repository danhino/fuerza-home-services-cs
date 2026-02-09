import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { getEnv } from "./env.js";

type SupabaseClaims = JWTPayload & {
  email?: string;
  phone?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (jwks) return jwks;
  const env = getEnv();
  if (!env.SUPABASE_URL) throw new Error("SUPABASE_URL is not set");
  const jwksUrl = new URL("/auth/v1/keys", env.SUPABASE_URL);
  jwks = createRemoteJWKSet(jwksUrl);
  return jwks;
}

export async function verifySupabaseToken(token: string) {
  const env = getEnv();
  if (!env.SUPABASE_URL) throw new Error("SUPABASE_URL is not set");
  const issuer = `${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1`;
  const { payload } = await jwtVerify(token, getJwks(), { issuer });
  return payload as SupabaseClaims;
}

export function roleFromClaims(payload: SupabaseClaims) {
  const fromApp = payload.app_metadata?.role;
  const fromUser = payload.user_metadata?.role;
  const role = (fromApp ?? fromUser) as string | undefined;
  if (role === "admin") return "admin";
  if (role === "technician") return "technician";
  if (role === "both") return "both";
  return "customer";
}

export function nameFromClaims(payload: SupabaseClaims) {
  const meta = payload.user_metadata ?? {};
  const name =
    (meta["name"] as string | undefined) ??
    (meta["full_name"] as string | undefined) ??
    (meta["display_name"] as string | undefined);
  return name;
}


