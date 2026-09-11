import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { query, queryOne } from "@barray/database";
import { UserRole } from "@barray/shared";
import { createSessionToken, SESSION_COOKIE, SessionPayload, verifySessionToken } from "./session";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  locale: "ar" | "fr" | "en";
  status: string;
}

export async function authenticate(email: string, password: string): Promise<SessionPayload | null> {
  const user = await queryOne<UserRow>(`SELECT * FROM users WHERE email = $1 AND status = 'ACTIVE'`, [email]);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  const roleRows = await query<{ code: UserRole }>(
    `SELECT r.code FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [user.id],
  );

  await query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);

  return {
    sub: user.id,
    email: user.email,
    fullName: user.full_name,
    roles: roleRows.map((r) => r.code),
    locale: user.locale,
  };
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function createSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function hasRole(session: SessionPayload | null, ...roles: UserRole[]): boolean {
  if (!session) return false;
  return session.roles.some((r) => roles.includes(r));
}
