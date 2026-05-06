import "server-only";
import { supabase } from "./server";
import { logSupabaseReadFailure } from "./errors";
import type { PourEvent } from "@/lib/ops/types";
import type { PourStatus, PourType } from "@/lib/ops/pourRules";
import { POUR_STATUS, POUR_TYPE_OPTIONS } from "@/lib/ops/pourRules";

const KNOWN_STATUSES = new Set<PourStatus>(Object.values(POUR_STATUS));
const KNOWN_TYPES    = new Set<PourType>(POUR_TYPE_OPTIONS);

function toStatus(v: string): PourStatus {
  return KNOWN_STATUSES.has(v as PourStatus) ? (v as PourStatus) : POUR_STATUS.DRAFT;
}
function toType(v: string): PourType {
  return KNOWN_TYPES.has(v as PourType) ? (v as PourType) : "Other";
}

export const POUR_SELECT_COLUMNS =
  'id, org_id, jobsite_id, location, date, "time", pour_type, yardage, estimated_duration, notes, ' +
  "pump_requested, pump_type, pump_notes, mason_requested, mason_count, mason_notes, " +
  "status, created_by, created_by_name, requested_at, " +
  "approved_by, approved_by_name, approved_at, " +
  "rejected_by, rejected_by_name, rejection_reason, " +
  "canceled_by, canceled_by_name, canceled_at, cancellation_reason, " +
  "related_work_order_ids, equipment_assignments, conflicts";

export function rowToPour(row: Record<string, unknown>): PourEvent {
  return {
    id:                   String(row.id ?? ""),
    orgId:                String(row.org_id ?? ""),
    jobsiteId:            row.jobsite_id == null ? undefined : String(row.jobsite_id),
    location:             String(row.location ?? ""),
    date:                 String(row.date ?? ""),
    time:                 String(row.time ?? ""),
    pourType:             toType(String(row.pour_type ?? "")),
    yardage:              Number(row.yardage ?? 0),
    estimatedDuration:    row.estimated_duration == null ? undefined : String(row.estimated_duration),
    notes:                row.notes == null ? undefined : String(row.notes),
    pumpRequest: {
      requested: Boolean(row.pump_requested),
      pumpType:  row.pump_type  == null ? undefined : String(row.pump_type),
      notes:     row.pump_notes == null ? undefined : String(row.pump_notes),
    },
    masonRequest: {
      requested:  Boolean(row.mason_requested),
      masonCount: row.mason_count == null ? undefined : Number(row.mason_count),
      notes:      row.mason_notes == null ? undefined : String(row.mason_notes),
    },
    status:               toStatus(String(row.status ?? "")),
    createdBy:            String(row.created_by ?? ""),
    createdByName:        String(row.created_by_name ?? ""),
    requestedAt:          String(row.requested_at ?? ""),
    approvedBy:           row.approved_by      == null ? undefined : String(row.approved_by),
    approvedByName:       row.approved_by_name == null ? undefined : String(row.approved_by_name),
    approvedAt:           row.approved_at      == null ? undefined : String(row.approved_at),
    rejectedBy:           row.rejected_by      == null ? undefined : String(row.rejected_by),
    rejectedByName:       row.rejected_by_name == null ? undefined : String(row.rejected_by_name),
    rejectionReason:      row.rejection_reason == null ? undefined : String(row.rejection_reason),
    canceledBy:           row.canceled_by      == null ? undefined : String(row.canceled_by),
    canceledByName:       row.canceled_by_name == null ? undefined : String(row.canceled_by_name),
    canceledAt:           row.canceled_at      == null ? undefined : String(row.canceled_at),
    cancellationReason:   row.cancellation_reason == null ? undefined : String(row.cancellation_reason),
    relatedWorkOrderIds:  Array.isArray(row.related_work_order_ids) ? (row.related_work_order_ids as string[]) : [],
    equipmentAssignments: Array.isArray(row.equipment_assignments)  ? (row.equipment_assignments  as string[]) : [],
    conflicts:            row.conflicts == null ? undefined : Boolean(row.conflicts),
  };
}

export async function fetchOrgPours(orgId: string): Promise<PourEvent[]> {
  try {
    const { data, error } = await supabase
      .from("ops_pours")
      .select(POUR_SELECT_COLUMNS)
      .eq("org_id", orgId)
      .order("date", { ascending: true });

    if (error) {
      logSupabaseReadFailure(`fetchOrgPours(${orgId})`, error);
      return [];
    }
    if (!data) return [];
    return (data as unknown as Record<string, unknown>[]).map(rowToPour);
  } catch (err) {
    logSupabaseReadFailure(`fetchOrgPours(${orgId})`, err);
    return [];
  }
}
