import "server-only";
import { supabase } from "./server";
import { logSupabaseReadFailure } from "./errors";
import type { Request, RequestStatus, RequestType, ManpowerTrade } from "@/lib/ops/types";

const KNOWN_TYPES = new Set<RequestType>(["mason", "pump_truck", "equipment", "manpower"]);
const KNOWN_STATUSES = new Set<RequestStatus>(["pending", "approved", "assigned", "open", "closed"]);
const KNOWN_TRADES = new Set<ManpowerTrade>([
  "laborer", "operator", "mason", "carpenter", "ironworker", "finisher", "foreman",
]);

function toType(v: string): RequestType {
  return KNOWN_TYPES.has(v as RequestType) ? (v as RequestType) : "manpower";
}
function toStatus(v: string): RequestStatus {
  return KNOWN_STATUSES.has(v as RequestStatus) ? (v as RequestStatus) : "open";
}
function toTrade(v: unknown): ManpowerTrade | undefined {
  if (typeof v !== "string") return undefined;
  return KNOWN_TRADES.has(v as ManpowerTrade) ? (v as ManpowerTrade) : undefined;
}

export const REQUEST_SELECT_COLUMNS =
  "id, type, trade, equipment_type, quantity, jobsite, jobsite_id, date_needed, notes, status, " +
  "requested_by, requested_by_user_id, assigned_to, assigned_from, assigned_from_custom, " +
  "assigned_at, assigned_by, assigned_to_id, assigned_to_label, assigned_to_role, " +
  "requested_count, source_pour_id, linked_mx_work_order_id";

export function rowToRequest(row: Record<string, unknown>): Request {
  return {
    id:                  String(row.id ?? ""),
    type:                toType(String(row.type ?? "")),
    trade:               toTrade(row.trade),
    equipmentType:       row.equipment_type == null ? undefined : String(row.equipment_type),
    quantity:            row.quantity == null ? undefined : Number(row.quantity),
    jobsite:             String(row.jobsite ?? ""),
    jobsiteId:           row.jobsite_id == null ? undefined : String(row.jobsite_id),
    dateNeeded:          String(row.date_needed ?? ""),
    notes:               row.notes == null ? undefined : String(row.notes),
    status:              toStatus(String(row.status ?? "")),
    requestedBy:         row.requested_by == null ? undefined : String(row.requested_by),
    requestedByUserId:   row.requested_by_user_id == null ? undefined : String(row.requested_by_user_id),
    assignedTo:          row.assigned_to == null ? undefined : String(row.assigned_to),
    assignedFrom:        row.assigned_from == null ? undefined : String(row.assigned_from),
    assignedFromCustom:  row.assigned_from_custom == null ? undefined : String(row.assigned_from_custom),
    assignedAt:          row.assigned_at == null ? undefined : String(row.assigned_at),
    assignedBy:          row.assigned_by == null ? undefined : String(row.assigned_by),
    assignedToId:        row.assigned_to_id == null ? undefined : String(row.assigned_to_id),
    assignedToLabel:     row.assigned_to_label == null ? undefined : String(row.assigned_to_label),
    assignedToRole:      row.assigned_to_role == null ? undefined : String(row.assigned_to_role),
    requestedCount:      row.requested_count == null ? undefined : Number(row.requested_count),
    sourcePourId:        row.source_pour_id == null ? undefined : String(row.source_pour_id),
    linkedMxWorkOrderId: row.linked_mx_work_order_id == null ? undefined : String(row.linked_mx_work_order_id),
  };
}

export async function fetchOrgRequests(orgId: string): Promise<Request[]> {
  try {
    const { data, error } = await supabase
      .from("ops_requests")
      .select(REQUEST_SELECT_COLUMNS)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      logSupabaseReadFailure(`fetchOrgRequests(${orgId})`, error);
      return [];
    }
    if (!data) return [];
    return (data as unknown as Record<string, unknown>[]).map(rowToRequest);
  } catch (err) {
    logSupabaseReadFailure(`fetchOrgRequests(${orgId})`, err);
    return [];
  }
}
