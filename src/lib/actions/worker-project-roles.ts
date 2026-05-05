"use server";

import { supabase } from "@/lib/supabase/server";
import { describeSupabaseError } from "@/lib/supabase/errors";
import type { ProjectPosition } from "@/types/domain";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

/**
 * Assign or update a worker's leadership position on a project.
 * Replaces any existing position for this worker+project pair.
 */
export async function serverAssignProjectPosition(
  workerId: string,
  projectId: string,
  position: ProjectPosition,
): Promise<{ error?: string }> {
  // Remove any existing row first (handles the update case)
  const { error: deleteError } = await supabase
    .from("worker_project_roles")
    .delete()
    .eq("worker_id", workerId)
    .eq("project_id", projectId);
  if (deleteError) return { error: describeSupabaseError(deleteError) };

  const { error } = await supabase.from("worker_project_roles").insert({
    org_id:     ORG_ID,
    worker_id:  workerId,
    project_id: projectId,
    position,
  });
  if (error) return { error: describeSupabaseError(error) };
  return {};
}

/** Remove a worker's leadership position from a project. */
export async function serverRemoveProjectPosition(
  workerId: string,
  projectId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("worker_project_roles")
    .delete()
    .eq("worker_id", workerId)
    .eq("project_id", projectId);
  if (error) return { error: describeSupabaseError(error) };
  return {};
}

/** Link a worker record to a Supabase auth user (called when admin invites a field leader). */
export async function serverLinkWorkerUser(
  workerId: string,
  userId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("workers")
    .update({ user_id: userId })
    .eq("id", workerId);
  if (error) return { error: describeSupabaseError(error) };
  return {};
}
