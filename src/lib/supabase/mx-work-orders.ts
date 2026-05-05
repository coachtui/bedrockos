import "server-only";
import { supabase } from "./server";
import { logSupabaseReadFailure } from "./errors";
import type {
  MxWorkOrder,
  MxWorkOrderCategory,
  MxWorkOrderPriority,
  MxWorkOrderStatus,
  ReadinessStatus,
} from "@/lib/mx/types";

const KNOWN_CATEGORIES = new Set<MxWorkOrderCategory>([
  "preventive", "corrective", "emergency", "inspection", "modification",
]);
const KNOWN_PRIORITIES = new Set<MxWorkOrderPriority>([
  "critical", "high", "medium", "low",
]);
const KNOWN_STATUSES = new Set<MxWorkOrderStatus>([
  "draft", "open", "triage", "approved", "scheduled",
  "in_progress", "waiting_parts", "blocked", "completed", "canceled",
]);
const KNOWN_READINESS = new Set<ReadinessStatus>([
  "ready", "limited", "at_risk", "scheduled_service", "in_shop", "awaiting_parts", "down",
]);
const KNOWN_SOURCES = new Set<NonNullable<MxWorkOrder["sourceType"]>>([
  "manual", "inspection", "alert",
]);

function toCategory(v: string): MxWorkOrderCategory {
  return KNOWN_CATEGORIES.has(v as MxWorkOrderCategory) ? (v as MxWorkOrderCategory) : "corrective";
}
function toPriority(v: string): MxWorkOrderPriority {
  return KNOWN_PRIORITIES.has(v as MxWorkOrderPriority) ? (v as MxWorkOrderPriority) : "medium";
}
function toStatus(v: string): MxWorkOrderStatus {
  return KNOWN_STATUSES.has(v as MxWorkOrderStatus) ? (v as MxWorkOrderStatus) : "open";
}
function toReadiness(v: unknown): ReadinessStatus | null {
  if (v == null) return null;
  return KNOWN_READINESS.has(v as ReadinessStatus) ? (v as ReadinessStatus) : null;
}
function toSource(v: unknown): MxWorkOrder["sourceType"] {
  if (typeof v !== "string") return undefined;
  return KNOWN_SOURCES.has(v as NonNullable<MxWorkOrder["sourceType"]>)
    ? (v as MxWorkOrder["sourceType"])
    : undefined;
}

export const MX_WO_SELECT_COLUMNS =
  "id, wo_number, title, description, category, priority, status, source_type, source_id, " +
  "equipment_id, equipment_label, project_id, project_name, requested_by, requested_by_user_id, " +
  "requested_date, needed_by_date, required_skills, estimated_hours, scheduled_start, scheduled_end, " +
  "actual_start, actual_end, readiness_impact, ops_blocking, assigned_mechanic_ids, completion_notes, " +
  "created_at, updated_at";

export function rowToMxWorkOrder(row: Record<string, unknown>): MxWorkOrder {
  return {
    id:                  String(row.id ?? ""),
    woNumber:            String(row.wo_number ?? ""),
    title:               String(row.title ?? ""),
    description:         row.description == null ? undefined : String(row.description),
    category:            toCategory(String(row.category ?? "")),
    priority:            toPriority(String(row.priority ?? "")),
    status:              toStatus(String(row.status ?? "")),
    sourceType:          toSource(row.source_type),
    sourceId:            row.source_id == null ? undefined : String(row.source_id),
    equipmentId:         row.equipment_id == null    ? undefined : String(row.equipment_id),
    equipmentLabel:      row.equipment_label == null ? undefined : String(row.equipment_label),
    projectId:           row.project_id == null      ? undefined : String(row.project_id),
    projectName:         row.project_name == null    ? undefined : String(row.project_name),
    requestedBy:         String(row.requested_by ?? ""),
    requestedByUserId:   row.requested_by_user_id == null ? undefined : String(row.requested_by_user_id),
    requestedDate:       String(row.requested_date ?? ""),
    neededByDate:        row.needed_by_date == null ? undefined : String(row.needed_by_date),
    requiredSkills:      Array.isArray(row.required_skills) ? (row.required_skills as string[]) : [],
    estimatedHours:      row.estimated_hours == null ? undefined : Number(row.estimated_hours),
    scheduledStart:      row.scheduled_start == null ? undefined : String(row.scheduled_start),
    scheduledEnd:        row.scheduled_end == null   ? undefined : String(row.scheduled_end),
    actualStart:         row.actual_start == null    ? undefined : String(row.actual_start),
    actualEnd:           row.actual_end == null      ? undefined : String(row.actual_end),
    readinessImpact:     toReadiness(row.readiness_impact),
    opsBlocking:         Boolean(row.ops_blocking),
    assignedMechanicIds: Array.isArray(row.assigned_mechanic_ids) ? (row.assigned_mechanic_ids as string[]) : [],
    completionNotes:     row.completion_notes == null ? undefined : String(row.completion_notes),
    createdAt:           String(row.created_at ?? ""),
    updatedAt:           String(row.updated_at ?? ""),
  };
}

export async function fetchOrgMxWorkOrders(orgId: string): Promise<MxWorkOrder[]> {
  try {
    const { data, error } = await supabase
      .from("mx_work_orders")
      .select(MX_WO_SELECT_COLUMNS)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      logSupabaseReadFailure(`fetchOrgMxWorkOrders(${orgId})`, error);
      return [];
    }
    if (!data) return [];
    return (data as unknown as Record<string, unknown>[]).map(rowToMxWorkOrder);
  } catch (err) {
    logSupabaseReadFailure(`fetchOrgMxWorkOrders(${orgId})`, err);
    return [];
  }
}
