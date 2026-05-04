import "server-only";
import { supabase } from "./server";
import type { CxTask, CxTaskType, CxTaskStatus, CxCrewRequirement } from "@/lib/cx/types";

const KNOWN_TASK_TYPES = new Set<CxTaskType>([
  "pour",
  "inspection",
  "delivery",
  "grading",
  "concrete",
  "framing",
  "electrical",
  "excavation",
  "utility",
  "paving",
  "demolition",
  "other",
]);

const KNOWN_TASK_STATUSES = new Set<CxTaskStatus>([
  "not_started",
  "in_progress",
  "on_hold",
  "complete",
]);

function toTaskType(t: string): CxTaskType {
  return KNOWN_TASK_TYPES.has(t as CxTaskType) ? (t as CxTaskType) : "other";
}

function toTaskStatus(s: string): CxTaskStatus {
  return KNOWN_TASK_STATUSES.has(s as CxTaskStatus)
    ? (s as CxTaskStatus)
    : "not_started";
}

export async function fetchOrgTasks(orgId: string): Promise<CxTask[]> {
  try {
    const { data, error } = await supabase
      .from("cx_tasks")
      .select(
        "id, project_id, name, type, start_date, end_date, location, status, crew_requirements, assigned_worker_ids, notes, external_id, original_duration, remaining_duration, predecessors, successors"
      )
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      type: toTaskType(row.type),
      startDate: row.start_date ?? undefined,
      endDate: row.end_date ?? undefined,
      location: row.location ?? undefined,
      status: toTaskStatus(row.status),
      crewRequirements: Array.isArray(row.crew_requirements)
        ? (row.crew_requirements as CxCrewRequirement[])
        : [],
      assignedWorkerIds: Array.isArray(row.assigned_worker_ids)
        ? (row.assigned_worker_ids as string[])
        : [],
      notes: row.notes ?? undefined,
      externalId: row.external_id ?? undefined,
      originalDuration: row.original_duration ?? undefined,
      remainingDuration: row.remaining_duration ?? undefined,
      predecessors: Array.isArray(row.predecessors) ? row.predecessors : [],
      successors: Array.isArray(row.successors) ? row.successors : [],
    }));
  } catch {
    return [];
  }
}
