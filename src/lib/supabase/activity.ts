import "server-only";
import { supabase } from "./server";
import { logSupabaseReadFailure } from "./errors";
import type { ActivityEvent } from "@/types/domain";
import type { ModuleId } from "@/types/org";

const KNOWN_MODULES = new Set<ActivityEvent["module"]>([
  "cru", "fix", "inspect", "datum", "ops", "mx", "schedule", "shell",
]);
const KNOWN_TARGETS = new Set<NonNullable<ActivityEvent["target_type"]>>([
  "issue", "alert", "asset", "project",
]);

function toModule(value: string): ActivityEvent["module"] {
  return KNOWN_MODULES.has(value as ModuleId | "shell")
    ? (value as ActivityEvent["module"])
    : "shell";
}
function toTargetType(value: unknown): ActivityEvent["target_type"] {
  if (typeof value !== "string") return undefined;
  return KNOWN_TARGETS.has(value as NonNullable<ActivityEvent["target_type"]>)
    ? (value as ActivityEvent["target_type"])
    : undefined;
}

const SELECT_COLUMNS =
  'id, actor_name, action, entity_type, entity_id, entity_name, project_id, module, "timestamp", target_type, target_id';

function toActivity(row: Record<string, unknown>): ActivityEvent {
  return {
    id:           String(row.id ?? ""),
    actor_name:   String(row.actor_name ?? ""),
    action:       String(row.action ?? ""),
    entity_type:  String(row.entity_type ?? ""),
    entity_id:    row.entity_id == null ? undefined : String(row.entity_id),
    entity_name:  String(row.entity_name ?? ""),
    project_id:   String(row.project_id ?? ""),
    module:       toModule(String(row.module ?? "")),
    timestamp:    String(row.timestamp ?? ""),
    target_type:  toTargetType(row.target_type),
    target_id:    row.target_id == null ? undefined : String(row.target_id),
  };
}

export async function fetchOrgActivity(
  orgId: string,
  limit = 200,
): Promise<ActivityEvent[]> {
  try {
    const { data, error } = await supabase
      .from("activity")
      .select(SELECT_COLUMNS)
      .eq("org_id", orgId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) {
      logSupabaseReadFailure(`fetchOrgActivity(${orgId})`, error);
      return [];
    }
    if (!data) return [];
    return (data as Record<string, unknown>[]).map(toActivity);
  } catch (err) {
    logSupabaseReadFailure(`fetchOrgActivity(${orgId})`, err);
    return [];
  }
}
