import "server-only";
import { supabase } from "./server";
import type { Project, ProjectStatus } from "@/types/domain";

const KNOWN_PROJECT_STATUSES = new Set<ProjectStatus>([
  "active", "on_hold", "completed", "planning",
]);

function toProjectStatus(s: string): ProjectStatus {
  return KNOWN_PROJECT_STATUSES.has(s as ProjectStatus) ? (s as ProjectStatus) : "planning";
}

export async function fetchOrgProjects(orgId: string): Promise<Project[]> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, slug, status, phase, location, pm_name, progress_pct, open_issues, last_activity, start_date, end_date, description, award_price, working_holiday_dates")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id:            row.id,
      name:          row.name,
      slug:          row.slug,
      status:        toProjectStatus(row.status),
      phase:         row.phase,
      location:      row.location,
      pm_name:       row.pm_name,
      progress_pct:  row.progress_pct,
      open_issues:   row.open_issues,
      last_activity: row.last_activity,
      start_date:    row.start_date,
      end_date:      row.end_date,
      description:           row.description ?? undefined,
      award_price:           row.award_price != null ? Number(row.award_price) : undefined,
      working_holiday_dates: Array.isArray(row.working_holiday_dates) ? row.working_holiday_dates : [],
    }));
  } catch {
    return [];
  }
}
