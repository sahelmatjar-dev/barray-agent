import { SignJWT, jwtVerify } from "jose";
import { UserRole } from "@barray/shared";

const encodedSecret = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me");

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
