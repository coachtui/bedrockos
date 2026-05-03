import "server-only";
import { supabase } from "./server";
import type { WorkerProjectRole, ProjectPosition } from "@/types/domain";

const VALID: Set<ProjectPosition> = new Set(["superintendent", "foreman"]);

function toPosition(p: string): ProjectPosition {
  return VALID.has(p as ProjectPosition) ? (p as ProjectPosition) : "foreman";
}

function mapRow(row: Record<string, unknown>): WorkerProjectRole {
  return {
    id:        row.id as string,
    orgId:     row.org_id as string,
    workerId:  row.worker_id as string,
    projectId: row.project_id as string,
    position:  toPosition(row.position as string),
  };
}

/** All leadership assignments in the org — used to populate admin UI. */
export async function fetchOrgWorkerProjectRoles(orgId: string): Promise<WorkerProjectRole[]> {
  try {
    const { data, error } = await supabase
      .from("worker_project_roles")
      .select("id, org_id, worker_id, project_id, position")
      .eq("org_id", orgId);
    if (error || !data) return [];
    return data.map(mapRow);
  } catch {
    return [];
  }
}

/** Find the worker record linked to a Supabase auth user. */
export async function fetchWorkerByUserId(
  orgId: string,
  userId: string,
): Promise<{ id: string } | null> {
  try {
    const { data, error } = await supabase
      .from("workers")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();
    if (error || !data) return null;
    return { id: data.id as string };
  } catch {
    return null;
  }
}

/** All project positions held by a specific worker — used at login to scope their access. */
export async function fetchWorkerPositions(workerId: string): Promise<WorkerProjectRole[]> {
  try {
    const { data, error } = await supabase
      .from("worker_project_roles")
      .select("id, org_id, worker_id, project_id, position")
      .eq("worker_id", workerId);
    if (error || !data) return [];
    return data.map(mapRow);
  } catch {
    return [];
  }
}
