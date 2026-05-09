"use server";

import { supabase } from "@/lib/supabase/server";
import { throwSupabaseWriteFailure } from "@/lib/supabase/errors";
import { REQUEST_SELECT_COLUMNS, rowToRequest } from "@/lib/supabase/ops-requests";
import type { Request } from "@/lib/ops/types";
import { getEnvOrgId } from "@/lib/config/org";

const ORG_ID = getEnvOrgId();

function toInsertRow(req: Request): Record<string, unknown> {
  return {
    id:                       req.id,
    org_id:                   ORG_ID,
    type:                     req.type,
    trade:                    req.trade ?? null,
    equipment_type:           req.equipmentType ?? null,
    quantity:                 req.quantity ?? null,
    jobsite:                  req.jobsite,
    jobsite_id:               req.jobsiteId ?? null,
    date_needed:              req.dateNeeded,
    notes:                    req.notes ?? null,
    status:                   req.status,
    requested_by:             req.requestedBy ?? null,
    requested_by_user_id:     req.requestedByUserId ?? null,
    assigned_to:              req.assignedTo ?? null,
    assigned_from:            req.assignedFrom ?? null,
    assigned_from_custom:     req.assignedFromCustom ?? null,
    assigned_at:              req.assignedAt ?? null,
    assigned_by:              req.assignedBy ?? null,
    assigned_to_id:           req.assignedToId ?? null,
    assigned_to_label:        req.assignedToLabel ?? null,
    assigned_to_role:         req.assignedToRole ?? null,
    requested_count:          req.requestedCount ?? null,
    source_pour_id:           req.sourcePourId ?? null,
    linked_mx_work_order_id:  req.linkedMxWorkOrderId ?? null,
  };
}

export async function serverCreateRequest(req: Request): Promise<Request> {
  const { data, error } = await supabase
    .from("ops_requests")
    .insert(toInsertRow(req))
    .select(REQUEST_SELECT_COLUMNS)
    .single();
  if (error || !data) throwSupabaseWriteFailure(`serverCreateRequest(${req.id})`, error);
  return rowToRequest(data as unknown as Record<string, unknown>);
}

export async function serverApproveRequest(id: string): Promise<Request> {
  const { data, error } = await supabase
    .from("ops_requests")
    .update({ status: "approved" })
    .eq("id", id)
    .eq("org_id", ORG_ID)
    .select(REQUEST_SELECT_COLUMNS)
    .single();
  if (error || !data) throwSupabaseWriteFailure(`serverApproveRequest(${id})`, error);
  return rowToRequest(data as unknown as Record<string, unknown>);
}

export interface AssignRequestPatch {
  status:               "assigned" | "closed";
  assignedTo?:          string;
  assignedFrom?:        string;
  assignedFromCustom?:  string;
  assignedAt?:          string;
  assignedBy?:          string;
  assignedToId?:        string;
  assignedToLabel?:     string;
  assignedToRole?:      string;
  linkedMxWorkOrderId?: string;
}

export async function serverAssignRequest(
  id: string,
  patch: AssignRequestPatch,
): Promise<Request> {
  const update: Record<string, unknown> = {
    status:                  patch.status,
    assigned_to:             patch.assignedTo         ?? null,
    assigned_from:           patch.assignedFrom       ?? null,
    assigned_from_custom:    patch.assignedFromCustom ?? null,
    assigned_at:             patch.assignedAt         ?? null,
    assigned_by:             patch.assignedBy         ?? null,
    assigned_to_id:          patch.assignedToId       ?? null,
    assigned_to_label:       patch.assignedToLabel    ?? null,
    assigned_to_role:        patch.assignedToRole     ?? null,
    linked_mx_work_order_id: patch.linkedMxWorkOrderId ?? null,
  };

  const { data, error } = await supabase
    .from("ops_requests")
    .update(update)
    .eq("id", id)
    .eq("org_id", ORG_ID)
    .select(REQUEST_SELECT_COLUMNS)
    .single();
  if (error || !data) throwSupabaseWriteFailure(`serverAssignRequest(${id})`, error);
  return rowToRequest(data as unknown as Record<string, unknown>);
}
