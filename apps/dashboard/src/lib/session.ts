import { SignJWT, jwtVerify } from "jose";
import { UserRole } from "@barray/shared";

/**
 * No fallback secret. A hardcoded default here would mean anyone who reads
 * this (public) source could forge a valid session JWT for ANY user,
 * including OWNER, on any deployment that forgot to set SESSION_SECRET.
 * Fail loudly at first use instead — see .env.example.
 */
function encodedSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET is not set (or is shorter than 32 characters). Generate one with `openssl rand -hex 32` " +
        "and set it in your environment — see .env.example. Refusing to sign or verify sessions without it.",
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  sub: string; // user id
  email: string;
  fullName: string;
  roles: UserRole[];
  locale: "ar" | "fr" | "en";
}

const SESSION_COOKIE = "barray_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(encodedSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE, SESSION_TTL_SECONDS };
