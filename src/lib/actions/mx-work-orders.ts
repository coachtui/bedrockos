"use server";

import { supabase } from "@/lib/supabase/server";
import { throwSupabaseWriteFailure } from "@/lib/supabase/errors";
import {
  MX_WO_SELECT_COLUMNS,
  rowToMxWorkOrder,
} from "@/lib/supabase/mx-work-orders";
import type {
  CreateMxWorkOrderInput,
  MxWorkOrder,
  MxWorkOrderStatus,
  MxWorkOrderUpdate,
} from "@/lib/mx/types";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export async function serverCreateMxWorkOrder(
  id: string,
  input: CreateMxWorkOrderInput,
): Promise<MxWorkOrder> {
  const { data, error } = await supabase
    .from("mx_work_orders")
    .insert({
      id,
      org_id:               ORG_ID,
      wo_number:            "", // overwritten by trigger
      title:                input.title,
      description:          input.description ?? null,
      category:             input.category,
      priority:             input.priority,
      status:               "open",
      source_type:          "manual",
      equipment_id:         input.equipmentId ?? null,
      equipment_label:      input.equipmentLabel ?? null,
      project_id:           input.projectId ?? null,
      project_name:         input.projectName ?? null,
      requested_by:         input.requestedBy,
      requested_by_user_id: input.requestedByUserId ?? null,
      requested_date:       input.requestedDate,
      needed_by_date:       input.neededByDate ?? null,
      required_skills:      input.requiredSkills ?? [],
      estimated_hours:      input.estimatedHours ?? null,
      readiness_impact:     input.readinessImpact ?? null,
      ops_blocking:         input.opsBlocking,
    })
    .select(MX_WO_SELECT_COLUMNS)
    .single();

  if (error || !data) throwSupabaseWriteFailure(`serverCreateMxWorkOrder(${id})`, error);
  return rowToMxWorkOrder(data as unknown as Record<string, unknown>);
}

export async function serverUpdateMxWorkOrderStatus(
  id: string,
  status: MxWorkOrderStatus,
): Promise<MxWorkOrder> {
  const patch: Record<string, unknown> = { status };
  const now = new Date().toISOString();
  if (status === "in_progress") patch.actual_start = now;
  if (status === "completed")   patch.actual_end   = now;

  const { data, error } = await supabase
    .from("mx_work_orders")
    .update(patch)
    .eq("id", id)
    .select(MX_WO_SELECT_COLUMNS)
    .single();

  if (error || !data) throwSupabaseWriteFailure(`serverUpdateMxWorkOrderStatus(${id})`, error);
  return rowToMxWorkOrder(data as unknown as Record<string, unknown>);
}

export async function serverUpdateMxWorkOrder(
  id: string,
  updates: MxWorkOrderUpdate,
): Promise<MxWorkOrder> {
  const patch: Record<string, unknown> = {};
  if (updates.priority         !== undefined) patch.priority         = updates.priority;
  if (updates.scheduledStart   !== undefined) patch.scheduled_start  = updates.scheduledStart  ?? null;
  if (updates.scheduledEnd     !== undefined) patch.scheduled_end    = updates.scheduledEnd    ?? null;
  if (updates.completionNotes  !== undefined) patch.completion_notes = updates.completionNotes ?? null;
  if (updates.opsBlocking      !== undefined) patch.ops_blocking     = updates.opsBlocking;
  if (updates.readinessImpact  !== undefined) patch.readiness_impact = updates.readinessImpact ?? null;

  const { data, error } = await supabase
    .from("mx_work_orders")
    .update(patch)
    .eq("id", id)
    .select(MX_WO_SELECT_COLUMNS)
    .single();

  if (error || !data) throwSupabaseWriteFailure(`serverUpdateMxWorkOrder(${id})`, error);
  return rowToMxWorkOrder(data as unknown as Record<string, unknown>);
}

export async function serverAssignMechanic(
  workOrderId: string,
  mechanicId: string,
): Promise<MxWorkOrder> {
  const { data: existing, error: readError } = await supabase
    .from("mx_work_orders")
    .select("assigned_mechanic_ids")
    .eq("id", workOrderId)
    .single();
  if (readError || !existing) throwSupabaseWriteFailure(`serverAssignMechanic(${workOrderId})`, readError);

  const current = Array.isArray(existing.assigned_mechanic_ids)
    ? (existing.assigned_mechanic_ids as string[])
    : [];
  const next = current.includes(mechanicId) ? current : [...current, mechanicId];

  const { data, error } = await supabase
    .from("mx_work_orders")
    .update({ assigned_mechanic_ids: next })
    .eq("id", workOrderId)
    .select(MX_WO_SELECT_COLUMNS)
    .single();

  if (error || !data) throwSupabaseWriteFailure(`serverAssignMechanic(${workOrderId})`, error);
  return rowToMxWorkOrder(data as unknown as Record<string, unknown>);
}

export async function serverUnassignMechanic(
  workOrderId: string,
  mechanicId: string,
): Promise<MxWorkOrder> {
  const { data: existing, error: readError } = await supabase
    .from("mx_work_orders")
    .select("assigned_mechanic_ids")
    .eq("id", workOrderId)
    .single();
  if (readError || !existing) throwSupabaseWriteFailure(`serverUnassignMechanic(${workOrderId})`, readError);

  const current = Array.isArray(existing.assigned_mechanic_ids)
    ? (existing.assigned_mechanic_ids as string[])
    : [];
  const next = current.filter((id) => id !== mechanicId);

  const { data, error } = await supabase
    .from("mx_work_orders")
    .update({ assigned_mechanic_ids: next })
    .eq("id", workOrderId)
    .select(MX_WO_SELECT_COLUMNS)
    .single();

  if (error || !data) throwSupabaseWriteFailure(`serverUnassignMechanic(${workOrderId})`, error);
  return rowToMxWorkOrder(data as unknown as Record<string, unknown>);
}
