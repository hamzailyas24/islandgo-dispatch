"use client";

import { createBrowserClient } from "@supabase/ssr";

// Public, browser-safe client. Only ever uses the anon key — RLS policies
// (see supabase/migrations/) decide what this client is allowed to read.
// Uses @supabase/ssr's cookie-based session storage so the same Supabase
// Auth session set by /api/auth/login (via the server client) is picked up
// here automatically, and Realtime subscriptions carry the user's JWT —
// which is what makes the role-scoped RLS policies apply to
// `postgres_changes` events too, not just one-off queries.
//
// Never import the service-role client from lib/supabase/server.ts into
// anything that ships to the browser.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Convenience singleton for client components that don't need a fresh
// instance per render.
export const supabaseBrowser = createSupabaseBrowserClient();
