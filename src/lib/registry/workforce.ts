/**
 * OrgWorkforceRegistry — Phase 1: thin wrapper over the CRU integration adapter.
 * Phase 3: worker records live in AIGACP; CRU syncs from here.
 *
 * All module code that needs workforce data should import from here,
 * not from @/lib/integrations/cru directly.
 */

import {
  getCruWorkersForOrg,
  getCruWorkersByRole,
  getCruMechanicsAndDrivers,
  type CruWorker,
} from "@/lib/integrations/cru";
import { MOCK_WORKERS } from "@/lib/mock/workers";
import type { OrgWorker, WorkerRole } from "@/types/domain";

const KNOWN_WORKER_ROLES = new Set<WorkerRole>([
  "mechanic", "driver", "mason", "carpenter", "foreman", "superintendent", "operator", "laborer",
]);

function toWorkerRole(r: string): WorkerRole {
  return KNOWN_WORKER_ROLES.has(r as WorkerRole) ? (r as WorkerRole) : "laborer";
}

function toOrgWorker(orgId: string) {
  return (w: CruWorker): OrgWorker => ({
    id:        w.id,
    name:      w.name,
    role:      toWorkerRole(w.role),
    orgId,
    userId:    null,
    projectId: w.siteId,
    siteName:  w.siteName,
    available: w.available,
    skills:    [],
  });
}

export async function getOrgWorkforce(orgId: string, siteId?: string): Promise<OrgWorker[]> {
  const workers = await getCruWorkersForOrg(orgId, siteId);
  return workers.map(toOrgWorker(orgId));
}

export async function getOrgWorkersByRole(orgId: string, role: WorkerRole): Promise<OrgWorker[]> {
  const workers = await getCruWorkersByRole(orgId, role);
  return workers.map(toOrgWorker(orgId));
}

export async function getOrgMechanicsAndDrivers(orgId: string): Promise<OrgWorker[]> {
  const workers = await getCruMechanicsAndDrivers(orgId);
  return workers.map(toOrgWorker(orgId));
}

/**
 * Phase 1–2: returns org workforce from MOCK_WORKERS (local, synchronous).
 * Phase 3: replaced by a Supabase fetch.
 */
export function getOrgWorkforceLocal(orgId: string, projectId?: string): OrgWorker[] {
  const all = MOCK_WORKERS.filter((w) => w.orgId === orgId);
  return projectId ? all.filter((w) => !w.projectId || w.projectId === projectId) : all;
}
