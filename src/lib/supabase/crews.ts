import "server-only";
import { supabase } from "./client";
import type { OrgCrew, CrewStatus } from "@/types/domain";

export async function fetchOrgCrews(orgId: string): Promise<OrgCrew[]> {
  try {
    const [{ data: crewData, error }, { data: memberData }] = await Promise.all([
      supabase
        .from("crews")
        .select("id, org_id, project_id, name, lead_name, status")
        .eq("org_id", orgId),
      supabase
        .from("crew_members")
        .select("crew_id, worker_id"),
    ]);

    if (error || !crewData) return [];

    const membersByCrewId: Record<string, string[]> = {};
    for (const m of memberData ?? []) {
      if (!membersByCrewId[m.crew_id]) membersByCrewId[m.crew_id] = [];
      membersByCrewId[m.crew_id].push(m.worker_id);
    }

    return crewData.map((row) => ({
      id:        row.id,
      orgId:     row.org_id,
      projectId: row.project_id,
      name:      row.name,
      memberIds: membersByCrewId[row.id] ?? [],
      leadName:  row.lead_name ?? undefined,
      status:    (row.status as CrewStatus) ?? undefined,
    }));
  } catch {
    return [];
  }
}
