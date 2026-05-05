import "server-only";
import { supabase } from "./server";
import { logSupabaseReadFailure } from "./errors";
import type { Issue, IssueSeverity, IssueStatus } from "@/types/domain";
import type { ModuleId } from "@/types/org";

const KNOWN_MODULES = new Set<ModuleId>([
  "cru", "fix", "inspect", "datum", "ops", "mx", "schedule",
]);
const KNOWN_SEVERITIES = new Set<IssueSeverity>(["critical", "high", "medium", "low"]);
const KNOWN_STATUSES   = new Set<IssueStatus>(["open", "in_progress", "resolved"]);

function toModule(value: string): ModuleId {
  return KNOWN_MODULES.has(value as ModuleId) ? (value as ModuleId) : "fix";
}
function toSeverity(value: string): IssueSeverity {
  return KNOWN_SEVERITIES.has(value as IssueSeverity) ? (value as IssueSeverity) : "low";
}
function toStatus(value: string): IssueStatus {
  return KNOWN_STATUSES.has(value as IssueStatus) ? (value as IssueStatus) : "open";
}

const SELECT_COLUMNS =
  "id, title, module, severity, project_id, project_name, created_at, assignee_name, status, asset_id, asset_name, inspection_id, description, related_work_order_id";

function toIssue(row: Record<string, unknown>): Issue {
  return {
    id:            String(row.id ?? ""),
    title:         String(row.title ?? ""),
    module:        toModule(String(row.module ?? "")),
    severity:      toSeverity(String(row.severity ?? "")),
    project_id:    String(row.project_id ?? ""),
    project_name:  row.project_name == null ? undefined : String(row.project_name),
    created_at:    String(row.created_at ?? ""),
    assignee_name: row.assignee_name == null ? null : String(row.assignee_name),
    status:        toStatus(String(row.status ?? "")),
    asset_id:      row.asset_id == null      ? undefined : String(row.asset_id),
    asset_name:    row.asset_name == null    ? undefined : String(row.asset_name),
    inspection_id:         row.inspection_id == null ? undefined : String(row.inspection_id),
    description:           row.description == null   ? undefined : String(row.description),
    related_work_order_id: row.related_work_order_id == null ? undefined : String(row.related_work_order_id),
  };
}

export async function fetchOrgIssues(orgId: string): Promise<Issue[]> {
  try {
    const { data, error } = await supabase
      .from("issues")
      .select(SELECT_COLUMNS)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      logSupabaseReadFailure(`fetchOrgIssues(${orgId})`, error);
      return [];
    }
    if (!data) return [];
    return (data as Record<string, unknown>[]).map(toIssue);
  } catch (err) {
    logSupabaseReadFailure(`fetchOrgIssues(${orgId})`, err);
    return [];
  }
}

export async function fetchOrgIssueById(
  orgId: string,
  issueId: string,
): Promise<Issue | null> {
  try {
    const { data, error } = await supabase
      .from("issues")
      .select(SELECT_COLUMNS)
      .eq("org_id", orgId)
      .eq("id", issueId)
      .maybeSingle();

    if (error) {
      logSupabaseReadFailure(`fetchOrgIssueById(${orgId}, ${issueId})`, error);
      return null;
    }
    if (!data) return null;
    return toIssue(data as Record<string, unknown>);
  } catch (err) {
    logSupabaseReadFailure(`fetchOrgIssueById(${orgId}, ${issueId})`, err);
    return null;
  }
}
