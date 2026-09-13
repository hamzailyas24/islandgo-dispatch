import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only client. Uses the service-role key so it can bypass RLS to
// perform validated writes (assign driver, update status). This file must
// NEVER be imported from a "use client" component — the `server-only`
// import above makes Next.js throw a build error if that happens, which is
// the safeguard against accidentally shipping the service-role key to the
// browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseServer = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
