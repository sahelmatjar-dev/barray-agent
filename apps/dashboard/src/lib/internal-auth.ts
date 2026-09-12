import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Auth for /api/internal/* routes, called by n8n's "Barray Dashboard API"
 * HTTP Header Auth credential — NOT the user session cookie. These routes
 * run deterministic @barray/shared logic against Postgres on n8n's behalf;
 * they never decide an approval gate (see docs/safety-rules.md) and never
 * accept a locale/role that would bypass RBAC checks elsewhere.
 */
export function assertInternalApiAuth(request: NextRequest): NextResponse | null {
  const expected = process.env.INTERNAL_API_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "INTERNAL_API_TOKEN is not configured on the server" }, { status: 500 });
  }
  const header = request.headers.get("authorization") ?? "";
  if (!constantTimeEquals(header, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

/** Avoids a timing side-channel on the token comparison — a plain `===`
 * returns as soon as the first differing byte is found, which (in theory,
 * over enough requests) can leak how many leading characters are correct. */
function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    // Still run a comparison of equal-length buffers so this branch takes
    // roughly the same time as the equal-length case, rather than returning instantly.
    timingSafeEqual(bufferA, bufferA);
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}
