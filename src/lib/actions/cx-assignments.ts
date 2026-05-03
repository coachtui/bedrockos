"use server";

import { supabase } from "@/lib/supabase/server";
import type { CxDayAssignment } from "@/lib/cx/types";

export async function serverCreateAssignment(orgId: string, assignment: CxDayAssignment): Promise<void> {
  await supabase.from("cx_day_assignments").insert({
    id:         assignment.id,
    org_id:     orgId,
    worker_id:  assignment.workerId,
    project_id: assignment.projectId,
    date:       assignment.date,
  });
}

export async function serverRemoveAssignment(id: string): Promise<void> {
  await supabase.from("cx_day_assignments").delete().eq("id", id);
}
