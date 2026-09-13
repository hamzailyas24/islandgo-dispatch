import { createClient } from "@supabase/supabase-js";

// Public, browser-safe client. Only ever uses the anon key — RLS policies
// (see supabase/schema.sql) decide what this client is allowed to read.
// Never import the service-role client below into anything that ships to
// the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});
