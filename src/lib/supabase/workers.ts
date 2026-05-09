import "server-only";
import { supabase } from "./server";
import { logSupabaseReadFailure } from "./errors";
import type { OrgWorker, WorkerRole } from "@/types/domain";

const KNOWN_ROLES = new Set<WorkerRole>([
  "mechanic", "driver", "mason", "carpenter",
  "foreman", "superintendent", "operator", "laborer",
]);

const VISIBLE_COUNT_ROLES = new Set<WorkerRole>([
  "operator", "laborer", "mason", "carpenter", "driver", "mechanic",
]);

export type ProjectWorkerCounts = Partial<Record<WorkerRole, number>>;

function toWorkerRole(r: string): WorkerRole {
  return KNOWN_ROLES.has(r as WorkerRole) ? (r as WorkerRole) : "laborer";
}

export async function fetchOrgWorkers(orgId: string): Promise<OrgWorker[]> {
  try {
    const { data, error } = await supabase
      .from("workers")
      .select("id, org_id, name, role, project_id, site_name, available, skills")
      .eq("org_id", orgId);

    if (error) {
      logSupabaseReadFailure(`fetchOrgWorkers(${orgId})`, error);
      return [];
    }
    if (!data) return [];

    return data.map((row) => ({
      id:        row.id,
      orgId:     row.org_id,
      name:      row.name,
      role:      toWorkerRole(row.role),
      userId:    null,
      projectId: row.project_id ?? undefined,
      siteName:  row.site_name ?? undefined,
      available: row.available === true,
      skills:    row.skills ?? [],
    }));
  } catch (err) {
    logSupabaseReadFailure(`fetchOrgWorkers(${orgId})`, err);
    return [];
  }
}

export async function fetchWorkerCountsByProject(
  orgId: string,
): Promise<Record<string, ProjectWorkerCounts>> {
  try {
    const { data, error } = await supabase
      .from("workers")
      .select("role, project_id")
      .eq("org_id", orgId);

    if (error) {
      logSupabaseReadFailure(`fetchWorkerCountsByProject(${orgId})`, error);
      return {};
    }
    if (!data) return {};

    const result: Record<string, ProjectWorkerCounts> = {};
    for (const row of data) {
      const projectId = row.project_id as string | null;
      if (!projectId) continue;
      const role = toWorkerRole(row.role);
      if (!VISIBLE_COUNT_ROLES.has(role)) continue;
      const counts = result[projectId] ?? {};
      counts[role] = (counts[role] ?? 0) + 1;
      result[projectId] = counts;
    }
    return result;
  } catch (err) {
    logSupabaseReadFailure(`fetchWorkerCountsByProject(${orgId})`, err);
    return {};
  }
}
