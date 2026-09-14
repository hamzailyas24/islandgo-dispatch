import "server-only";

// Validates required server-side environment variables once, at import
// time, so a missing secret fails loudly with a clear message instead of
// surfacing later as a confusing runtime error deep inside a request
// handler (e.g. "Invalid API key" from Supabase with no indication which
// env var is missing).
//
// Import `serverEnv` (not `process.env` directly) from any server-only
// module that needs these values.

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. Check .env.local (or your ` +
        `deployment's environment variables) against .env.example.`
    );
  }
  return value;
}

export const serverEnv = {
  SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
};
