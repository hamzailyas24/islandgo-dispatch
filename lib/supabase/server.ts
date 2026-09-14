import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";

// Privileged, service-role client. Bypasses RLS entirely — only ever used
// for writes that have already been validated by the calling API route
// (assign driver, update status, write audit log rows). This file must
// NEVER be imported from a "use client" component — the `server-only`
// import above makes Next.js throw a build error if that happens, which is
// the safeguard against accidentally shipping the service-role key to the
// browser.
export const supabaseServer = createClient(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Auth-aware, RLS-respecting client for use inside Server Components and
// Route Handlers. Reads the caller's Supabase Auth session from cookies,
// so every query through this client is subject to the RLS policies for
// whichever role (admin/driver) that user actually has — unlike
// `supabaseServer` above, this client can only see what its RLS policies
// allow.
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render (not a Route Handler) —
          // Next.js disallows setting cookies there. Session refresh in
          // that case is handled by middleware.ts instead, so this is safe
          // to ignore.
        }
      },
    },
  });
}
