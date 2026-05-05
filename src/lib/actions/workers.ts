"use server";

import { supabase } from "@/lib/supabase/server";
import { throwSupabaseWriteFailure } from "@/lib/supabase/errors";
import type { OrgWorker } from "@/types/domain";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export async function serverCreateWorker(worker: OrgWorker): Promise<void> {
  const { error } = await supabase.from("workers").insert({
    id:         worker.id,
    org_id:     ORG_ID,
    name:       worker.name,
    role:       worker.role,
    project_id: worker.projectId ?? null,
    site_name:  worker.siteName  ?? null,
    available:  worker.available,
    skills:     worker.skills,
  });
  if (error) throwSupabaseWriteFailure(`serverCreateWorker(${worker.id})`, error);
}

export async function serverUpdateWorker(
  id: string,
  patch: { name?: string; role?: string; projectId?: string | null; siteName?: string | null; available?: boolean; skills?: string[] },
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.name       !== undefined) update.name       = patch.name;
  if (patch.role       !== undefined) update.role       = patch.role;
  if (patch.projectId  !== undefined) update.project_id = patch.projectId ?? null;
  if (patch.siteName   !== undefined) update.site_name  = patch.siteName  ?? null;
  if (patch.available  !== undefined) update.available  = patch.available;
  if (patch.skills     !== undefined) update.skills     = patch.skills;
  if (Object.keys(update).length === 0) return;
  const { error } = await supabase.from("workers").update(update).eq("id", id);
  if (error) throwSupabaseWriteFailure(`serverUpdateWorker(${id})`, error);
}
