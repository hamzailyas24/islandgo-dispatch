import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Runs on the Edge runtime. Uses @supabase/ssr's cookie-based session so
// the exact same Supabase Auth session set by /api/auth/login (Node
// runtime) is readable here. Also refreshes the session cookie on every
// request, which is required by @supabase/ssr for the session to stay
// valid across requests.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isDriverRoute = pathname.startsWith("/driver");

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminRoute && !isDriverRoute) return response;

  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role check happens here too (not just in getSession() server-side) so
  // an unauthorized role is redirected before the page even renders.
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || (isAdminRoute && profile.role !== "admin") || (isDriverRoute && profile.role !== "driver")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/driver/:path*"],
};
