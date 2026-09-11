import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./lib/session";

const SESSION_COOKIE = "barray_session";
// /api/internal/* uses its own Bearer-token auth (assertInternalApiAuth), not
// the user session cookie — n8n calls these routes, never a logged-in browser.
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/internal/"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
