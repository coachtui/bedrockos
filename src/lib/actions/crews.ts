"use server";
import { supabase } from "@/lib/supabase/server";
import { throwSupabaseWriteFailure } from "@/lib/supabase/errors";
import type { OrgCrew } from "@/types/domain";
import { getEnvOrgId } from "@/lib/config/org";

const ORG_ID = getEnvOrgId();

export async function serverCreateCrew(crew: OrgCrew): Promise<void> {
  const { error } = await supabase.from("crews").insert({
    id:         crew.id,
    org_id:     ORG_ID,
    project_id: crew.projectId,
    name:       crew.name,
    lead_name:  crew.leadName ?? null,
    status:     crew.status ?? null,
  });
  if (error) throwSupabaseWriteFailure(`serverCreateCrew(${crew.id})`, error);
}

export async function serverAddCrewMember(
  crewId: string,
  workerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("crew_members")
    .upsert({ crew_id: crewId, worker_id: workerId }, { onConflict: "crew_id,worker_id" });
  if (error) throwSupabaseWriteFailure(`serverAddCrewMember(${crewId}, ${workerId})`, error);
}

export async function serverRemoveCrewMember(
  crewId: string,
  workerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId)
    .eq("worker_id", workerId);
  if (error) throwSupabaseWriteFailure(`serverRemoveCrewMember(${crewId}, ${workerId})`, error);
}
