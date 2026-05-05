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
  });
  if (error) throwSupabaseWriteFailure(`serverInsertIssue(${issue.id})`, error);
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
