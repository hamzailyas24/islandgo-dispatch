import "server-only";
import { createSupabaseServerClient, supabaseServer } from "@/lib/supabase/server";

export type Role = "admin" | "driver";

export interface Session {
  userId: string;
  role: Role;
  driverId?: string;
  driverName?: string;
}

// Resolves the current request's Supabase Auth user (from the session
// cookie set by /api/auth/login) plus their role and, for drivers, their
// linked drivers.id — the same shape the rest of the app previously got
// from the custom signed-cookie session, so API routes and pages didn't
// need to change their call sites, only this implementation.
export async function getSession(): Promise<Session | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile) return null;

  if (profile.role === "admin") {
    return { userId: user.id, role: "admin" };
  }

  if (profile.role === "driver") {
    // Looked up with the service-role client rather than the RLS-scoped
    // one: the driver's own RLS policy (`auth_user_id = auth.uid()`)
    // would also work here, but the service-role lookup keeps this path
    // identical regardless of future policy changes, and this is a
    // read of the user's own linkage only — nothing else is exposed.
    const { data: driver } = await supabaseServer
      .from("drivers")
      .select("id, name")
      .eq("auth_user_id", user.id)
      .single();
    if (!driver) return null;
    return { userId: user.id, role: "driver", driverId: driver.id, driverName: driver.name };
  }

  return null;
}
