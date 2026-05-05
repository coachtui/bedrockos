"use server";
import { supabase } from "@/lib/supabase/server";
import { throwSupabaseWriteFailure } from "@/lib/supabase/errors";
import type { Project, UpdateProjectInput } from "@/types/domain";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export async function serverCreateProject(project: Project): Promise<void> {
  const { error } = await supabase.from("projects").insert({
    id:            project.id,
    org_id:        ORG_ID,
    name:          project.name,
    slug:          project.slug,
    status:        project.status,
    phase:         project.phase,
    location:      project.location,
    pm_name:       project.pm_name,
    progress_pct:  project.progress_pct,
    open_issues:   project.open_issues,
    last_activity: project.last_activity,
    start_date:    project.start_date,
    end_date:      project.end_date,
    description:           project.description ?? null,
    award_price:           project.award_price ?? null,
    working_holiday_dates: project.working_holiday_dates ?? [],
  });
  if (error) throwSupabaseWriteFailure(`serverCreateProject(${project.id})`, error);
}

export async function serverUpdateProject(
  id: string,
  patch: UpdateProjectInput,
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.name        !== undefined) update.name        = patch.name;
  if (patch.location    !== undefined) update.location    = patch.location;
  if (patch.phase       !== undefined) update.phase       = patch.phase;
  if (patch.pm_name     !== undefined) update.pm_name     = patch.pm_name;
  if (patch.status      !== undefined) update.status      = patch.status;
  if (patch.start_date  !== undefined) update.start_date  = patch.start_date;
  if (patch.end_date    !== undefined) update.end_date    = patch.end_date;
  if (patch.description !== undefined) update.description = patch.description ?? null;
  if (patch.award_price           !== undefined) update.award_price           = patch.award_price ?? null;
  if (patch.working_holiday_dates !== undefined) update.working_holiday_dates = patch.working_holiday_dates;
  if (Object.keys(update).length === 0) return;
  const { error } = await supabase.from("projects").update(update).eq("id", id);
  if (error) throwSupabaseWriteFailure(`serverUpdateProject(${id})`, error);
}
