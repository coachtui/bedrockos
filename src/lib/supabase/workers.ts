import "server-only";
import { supabase } from "./server";
import { logSupabaseReadFailure } from "./errors";
import type { OrgWorker, WorkerRole } from "@/types/domain";

const KNOWN_ROLES = new Set<WorkerRole>([
  "mechanic", "driver", "mason", "carpenter",
  "foreman", "superintendent", "operator", "laborer",
]);

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
