import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/session";

// Middleware runs on the Edge runtime, so it verifies the signed cookie
// using the Web-Crypto based helper in lib/session.ts (Node's `crypto`
// module used by lib/auth.ts is not available on the Edge runtime).

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isDriverRoute = pathname.startsWith("/driver");

  if (!isAdminRoute && !isDriverRoute) return NextResponse.next();

  const raw = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionCookieValue(raw);

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && session.role !== "admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isDriverRoute && session.role !== "driver") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/driver/:path*"],
};
