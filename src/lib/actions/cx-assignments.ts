"use server";

import { supabase } from "@/lib/supabase/server";
import { throwSupabaseWriteFailure } from "@/lib/supabase/errors";
import type { CxDayAssignment } from "@/lib/cx/types";

export async function serverCreateAssignment(orgId: string, assignment: CxDayAssignment): Promise<void> {
  const { error } = await supabase.from("cx_day_assignments").insert({
    id:         assignment.id,
    org_id:     orgId,
    worker_id:  assignment.workerId,
    project_id: assignment.projectId,
    date:       assignment.date,
  });
  if (error) throwSupabaseWriteFailure(`serverCreateAssignment(${assignment.id})`, error);
}

export async function serverRemoveAssignment(id: string): Promise<void> {
  const { error } = await supabase.from("cx_day_assignments").delete().eq("id", id);
  if (error) throwSupabaseWriteFailure(`serverRemoveAssignment(${id})`, error);
}
