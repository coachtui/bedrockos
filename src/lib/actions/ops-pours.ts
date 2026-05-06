"use server";

import { supabase } from "@/lib/supabase/server";
import { throwSupabaseWriteFailure } from "@/lib/supabase/errors";
import { POUR_SELECT_COLUMNS, rowToPour } from "@/lib/supabase/ops-pours";
import { POUR_STATUS } from "@/lib/ops/pourRules";
import type { CreatePourInput, PourEvent } from "@/lib/ops/types";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export async function serverCreatePour(
  id: string,
  input: CreatePourInput,
  asDraft: boolean,
): Promise<PourEvent> {
  const { data, error } = await supabase
    .from("ops_pours")
    .insert({
      id,
      org_id:             ORG_ID,
      jobsite_id:         input.jobsiteId,
      location:           input.location,
      date:               input.date,
      time:               input.time,
      pour_type:          input.pourType,
      yardage:            input.yardage,
      estimated_duration: input.estimatedDuration ?? null,
      notes:              input.notes ?? null,
      pump_requested:     input.pumpRequest.requested,
      pump_type:          input.pumpRequest.pumpType ?? null,
      pump_notes:         input.pumpRequest.notes ?? null,
      mason_requested:    input.masonRequest.requested,
      mason_count:        input.masonRequest.masonCount ?? null,
      mason_notes:        input.masonRequest.notes ?? null,
      status:             asDraft ? POUR_STATUS.DRAFT : POUR_STATUS.PENDING_APPROVAL,
      created_by:         input.createdBy,
      created_by_name:    input.createdByName,
    })
    .select(POUR_SELECT_COLUMNS)
    .single();

  if (error || !data) throwSupabaseWriteFailure(`serverCreatePour(${id})`, error);
  return rowToPour(data as unknown as Record<string, unknown>);
}

export async function serverEditPour(
  id: string,
  updates: Omit<CreatePourInput, "createdBy" | "createdByName">,
  newStatus: PourEvent["status"],
  clearApproval: boolean,
): Promise<PourEvent> {
  const patch: Record<string, unknown> = {
    jobsite_id:         updates.jobsiteId,
    location:           updates.location,
    date:               updates.date,
    time:               updates.time,
    pour_type:          updates.pourType,
    yardage:            updates.yardage,
    estimated_duration: updates.estimatedDuration ?? null,
    notes:              updates.notes ?? null,
    pump_requested:     updates.pumpRequest.requested,
    pump_type:          updates.pumpRequest.pumpType ?? null,
    pump_notes:         updates.pumpRequest.notes ?? null,
    mason_requested:    updates.masonRequest.requested,
    mason_count:        updates.masonRequest.masonCount ?? null,
    mason_notes:        updates.masonRequest.notes ?? null,
    status:             newStatus,
  };
  if (clearApproval) {
    patch.approved_by      = null;
    patch.approved_by_name = null;
    patch.approved_at      = null;
  }

  const { data, error } = await supabase
    .from("ops_pours")
    .update(patch)
    .eq("id", id)
    .eq("org_id", ORG_ID)
    .select(POUR_SELECT_COLUMNS)
    .single();

  if (error || !data) throwSupabaseWriteFailure(`serverEditPour(${id})`, error);
  return rowToPour(data as unknown as Record<string, unknown>);
}

export async function serverSubmitPourForApproval(id: string): Promise<PourEvent> {
  const { data, error } = await supabase
    .from("ops_pours")
    .update({ status: POUR_STATUS.PENDING_APPROVAL, rejection_reason: null })
    .eq("id", id)
    .eq("org_id", ORG_ID)
    .select(POUR_SELECT_COLUMNS)
    .single();
  if (error || !data) throwSupabaseWriteFailure(`serverSubmitPourForApproval(${id})`, error);
  return rowToPour(data as unknown as Record<string, unknown>);
}

export async function serverApprovePour(
  id: string,
  actorId: string,
  actorName: string,
): Promise<PourEvent> {
  const { data, error } = await supabase
    .from("ops_pours")
    .update({
      status:           POUR_STATUS.APPROVED,
      approved_by:      actorId,
      approved_by_name: actorName,
      approved_at:      new Date().toISOString(),
      rejected_by:      null,
      rejected_by_name: null,
      rejection_reason: null,
    })
    .eq("id", id)
    .eq("org_id", ORG_ID)
    .select(POUR_SELECT_COLUMNS)
    .single();
  if (error || !data) throwSupabaseWriteFailure(`serverApprovePour(${id})`, error);
  return rowToPour(data as unknown as Record<string, unknown>);
}

export async function serverRejectPour(
  id: string,
  reason: string,
  actorId: string,
  actorName: string,
): Promise<PourEvent> {
  const { data, error } = await supabase
    .from("ops_pours")
    .update({
      status:           POUR_STATUS.REJECTED,
      rejected_by:      actorId,
      rejected_by_name: actorName,
      rejection_reason: reason.trim() || "No reason provided.",
      approved_by:      null,
      approved_by_name: null,
      approved_at:      null,
    })
    .eq("id", id)
    .eq("org_id", ORG_ID)
    .select(POUR_SELECT_COLUMNS)
    .single();
  if (error || !data) throwSupabaseWriteFailure(`serverRejectPour(${id})`, error);
  return rowToPour(data as unknown as Record<string, unknown>);
}

export async function serverCancelPour(
  id: string,
  reason: string,
  actorId: string,
  actorName: string,
): Promise<PourEvent> {
  const { data, error } = await supabase
    .from("ops_pours")
    .update({
      status:              POUR_STATUS.CANCELED,
      canceled_by:         actorId,
      canceled_by_name:    actorName,
      canceled_at:         new Date().toISOString(),
      cancellation_reason: reason.trim() || "No reason provided.",
    })
    .eq("id", id)
    .eq("org_id", ORG_ID)
    .select(POUR_SELECT_COLUMNS)
    .single();
  if (error || !data) throwSupabaseWriteFailure(`serverCancelPour(${id})`, error);
  return rowToPour(data as unknown as Record<string, unknown>);
}
