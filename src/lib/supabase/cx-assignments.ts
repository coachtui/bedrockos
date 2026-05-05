import "server-only";
import { supabase } from "./server";
import { logSupabaseReadFailure } from "./errors";
import type { CxDayAssignment } from "@/lib/cx/types";

export async function fetchOrgAssignments(
  orgId: string
): Promise<CxDayAssignment[]> {
  try {
    const { data, error } = await supabase
      .from("cx_day_assignments")
      .select("id, worker_id, project_id, date")
      .eq("org_id", orgId)
      .order("date", { ascending: true });

    if (error) {
      logSupabaseReadFailure(`fetchOrgAssignments(${orgId})`, error);
      return [];
    }
    if (!data) return [];

    return data.map((row) => ({
      id: row.id,
      workerId: row.worker_id,
      projectId: row.project_id,
      date: row.date,
    }));
  } catch (err) {
    logSupabaseReadFailure(`fetchOrgAssignments(${orgId})`, err);
    return [];
  }
}
