"use server";
import { supabase } from "@/lib/supabase/client";
import type { OrgCrew } from "@/types/domain";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export async function serverCreateCrew(crew: OrgCrew): Promise<void> {
  await supabase.from("crews").insert({
    id:         crew.id,
    org_id:     ORG_ID,
    project_id: crew.projectId,
    name:       crew.name,
    lead_name:  crew.leadName ?? null,
    status:     crew.status ?? null,
  });
}

export async function serverAddCrewMember(
  crewId: string,
  workerId: string,
): Promise<void> {
  await supabase
    .from("crew_members")
    .upsert({ crew_id: crewId, worker_id: workerId }, { onConflict: "crew_id,worker_id" });
}

export async function serverRemoveCrewMember(
  crewId: string,
  workerId: string,
): Promise<void> {
  await supabase
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId)
    .eq("worker_id", workerId);
}
