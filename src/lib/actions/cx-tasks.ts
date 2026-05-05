"use server";

import { supabase } from "@/lib/supabase/server";
import { throwSupabaseWriteFailure } from "@/lib/supabase/errors";
import type { CxTask } from "@/lib/cx/types";

function toRow(orgId: string, task: CxTask) {
  return {
    id:                  task.id,
    org_id:              orgId,
    project_id:          task.projectId,
    name:                task.name,
    type:                task.type,
    start_date:          task.startDate          ?? null,
    end_date:            task.endDate            ?? null,
    location:            task.location           ?? null,
    status:              task.status,
    crew_requirements:   task.crewRequirements,
    assigned_worker_ids: task.assignedWorkerIds,
    notes:               task.notes              ?? null,
    external_id:         task.externalId         ?? null,
  };
}

export async function serverCreateTask(orgId: string, task: CxTask): Promise<void> {
  const { error } = await supabase.from("cx_tasks").insert(toRow(orgId, task));
  if (error) throwSupabaseWriteFailure(`serverCreateTask(${task.id})`, error);
}

export async function serverBulkCreateTasks(orgId: string, tasks: CxTask[]): Promise<void> {
  if (tasks.length === 0) return;
  const { error } = await supabase.from("cx_tasks").insert(tasks.map((t) => toRow(orgId, t)));
  if (error) throwSupabaseWriteFailure(`serverBulkCreateTasks(${tasks.length})`, error);
}

export async function serverUpdateTask(id: string, patch: Partial<CxTask>): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.name              !== undefined) update.name                = patch.name;
  if (patch.type              !== undefined) update.type                = patch.type;
  if (patch.startDate         !== undefined) update.start_date          = patch.startDate ?? null;
  if (patch.endDate           !== undefined) update.end_date            = patch.endDate   ?? null;
  if (patch.location          !== undefined) update.location            = patch.location  ?? null;
  if (patch.status            !== undefined) update.status              = patch.status;
  if (patch.crewRequirements  !== undefined) update.crew_requirements   = patch.crewRequirements;
  if (patch.assignedWorkerIds !== undefined) update.assigned_worker_ids = patch.assignedWorkerIds;
  if (patch.notes             !== undefined) update.notes               = patch.notes     ?? null;
  if (patch.externalId        !== undefined) update.external_id         = patch.externalId ?? null;
  if (Object.keys(update).length === 0) return;
  const { error } = await supabase.from("cx_tasks").update(update).eq("id", id);
  if (error) throwSupabaseWriteFailure(`serverUpdateTask(${id})`, error);
}
