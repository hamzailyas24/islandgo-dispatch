import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

interface AuditEntry {
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}

// Writes one audit_log row using the service-role client (the table has no
// insert policy for authenticated/anon, so this is the only path that can
// write to it). Failures are logged but never thrown — an audit-log write
// failure must not block the actual dispatch action it's recording.
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const { error } = await supabaseServer.from("audit_log").insert({
    actor_id: entry.actorId,
    actor_role: entry.actorRole,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
  if (error) {
    console.error("Failed to write audit log entry:", entry.action, entry.entityType, error);
  }
}
