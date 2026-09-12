import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, createSessionCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Brute-force / credential-stuffing guard: 10 attempts per IP+email pair
// per 5 minutes. Deliberately keyed on IP+email (not IP alone) so a big
// shared-NAT office can't get everyone locked out by one person's typos.
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const rateLimitKey = `login:${getClientIp(request.headers)}:${parsed.data.email.toLowerCase()}`;
  const rateLimit = checkRateLimit(rateLimitKey, MAX_LOGIN_ATTEMPTS, LOGIN_WINDOW_MS);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "too_many_attempts" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const session = await authenticate(parsed.data.email, parsed.data.password);
  if (!session) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await createSessionCookie(session);
  return NextResponse.json({ ok: true, locale: session.locale });
}
