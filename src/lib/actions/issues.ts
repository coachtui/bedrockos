"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/server";
import { throwSupabaseWriteFailure } from "@/lib/supabase/errors";
import type { IssueStatus } from "@/types/domain";

const KNOWN_STATUSES: IssueStatus[] = ["open", "in_progress", "resolved"];

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
