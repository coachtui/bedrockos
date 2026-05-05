import "server-only";
import { supabase } from "./server";
import { logSupabaseReadFailure } from "./errors";
import type { Alert, AlertType, AlertSeverity } from "@/types/domain";

const KNOWN_TYPES = new Set<AlertType>([
  "safety", "schedule", "equipment", "budget", "inspection",
]);
const KNOWN_SEVERITIES = new Set<AlertSeverity>(["critical", "warning", "info"]);

function toType(value: string): AlertType {
  return KNOWN_TYPES.has(value as AlertType) ? (value as AlertType) : "schedule";
}
function toSeverity(value: string): AlertSeverity {
  return KNOWN_SEVERITIES.has(value as AlertSeverity) ? (value as AlertSeverity) : "info";
}

const SELECT_COLUMNS =
  "id, type, severity, message, project_id, project_name, created_at, is_read, description, related_issue_id";

function toAlert(row: Record<string, unknown>): Alert {
  return {
    id:               String(row.id ?? ""),
    type:             toType(String(row.type ?? "")),
    severity:         toSeverity(String(row.severity ?? "")),
    message:          String(row.message ?? ""),
    project_id:       String(row.project_id ?? ""),
    project_name:     row.project_name == null ? undefined : String(row.project_name),
    created_at:       String(row.created_at ?? ""),
    is_read:          Boolean(row.is_read),
    description:      row.description == null      ? undefined : String(row.description),
    related_issue_id: row.related_issue_id == null ? undefined : String(row.related_issue_id),
  };
}

export async function fetchOrgAlerts(orgId: string): Promise<Alert[]> {
  try {
    const { data, error } = await supabase
      .from("alerts")
      .select(SELECT_COLUMNS)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      logSupabaseReadFailure(`fetchOrgAlerts(${orgId})`, error);
      return [];
    }
    if (!data) return [];
    return (data as Record<string, unknown>[]).map(toAlert);
  } catch (err) {
    logSupabaseReadFailure(`fetchOrgAlerts(${orgId})`, err);
    return [];
  }
}

export async function fetchOrgAlertById(
  orgId: string,
  alertId: string,
): Promise<Alert | null> {
  try {
    const { data, error } = await supabase
      .from("alerts")
      .select(SELECT_COLUMNS)
      .eq("org_id", orgId)
      .eq("id", alertId)
      .maybeSingle();

    if (error) {
      logSupabaseReadFailure(`fetchOrgAlertById(${orgId}, ${alertId})`, error);
      return null;
    }
    if (!data) return null;
    return toAlert(data as Record<string, unknown>);
  } catch (err) {
    logSupabaseReadFailure(`fetchOrgAlertById(${orgId}, ${alertId})`, err);
    return null;
  }
}
