"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/server";
import { throwSupabaseWriteFailure } from "@/lib/supabase/errors";
import type { Issue, IssueStatus } from "@/types/domain";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";
const KNOWN_STATUSES: IssueStatus[] = ["open", "in_progress", "resolved"];

export async function serverInsertIssue(issue: Issue): Promise<void> {
  const { error } = await supabase.from("issues").insert({
    id:                    issue.id,
    org_id:                ORG_ID,
    title:                 issue.title,
    module:                issue.module,
    severity:              issue.severity,
    project_id:            issue.project_id,
    project_name:          issue.project_name ?? null,
    created_at:            issue.created_at,
    assignee_name:         issue.assignee_name ?? null,
    status:                issue.status,
    asset_id:              issue.asset_id ?? null,
    asset_name:            issue.asset_name ?? null,
    inspection_id:         issue.inspection_id ?? null,
    description:           issue.description ?? null,
    related_work_order_id: issue.related_work_order_id ?? null,
    related_task_id:       issue.related_task_id ?? null,
    photo_paths:           issue.photo_paths ?? [],
  });
  if (error) throwSupabaseWriteFailure(`serverInsertIssue(${issue.id})`, error);
}

export async function createIssuePhotoUploadUrl(
  fileName: string,
): Promise<{ uploadUrl?: string; storagePath?: string; error?: string }> {
  const uuid        = crypto.randomUUID();
  const safeName    = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${ORG_ID}/inspect/${uuid}-${safeName}`;

  const { data, error } = await supabase.storage
    .from("project-files")
    .createSignedUploadUrl(storagePath);

  if (error || !data) return { error: error?.message ?? "Could not create upload URL." };
  return { uploadUrl: data.signedUrl, storagePath };
}

export async function getIssuePhotoSignedUrl(
  storagePath: string,
): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.storage
    .from("project-files")
    .createSignedUrl(storagePath, 60 * 60); // 1 hour
  if (error || !data) return { error: "Could not generate photo link." };
  return { url: data.signedUrl };
}

export async function serverSetIssueStatus(id: string, status: IssueStatus): Promise<void> {
  if (!KNOWN_STATUSES.includes(status)) {
    throw new Error(`serverSetIssueStatus: invalid status ${status}`);
  }
  const { error } = await supabase
    .from("issues")
    .update({ status })
    .eq("id", id);
  if (error) throwSupabaseWriteFailure(`serverSetIssueStatus(${id}, ${status})`, error);

  revalidatePath("/issues");
  revalidatePath(`/issues/${id}`);
}
