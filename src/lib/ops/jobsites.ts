/**
 * jobsites — resolves which jobsites a user is allowed to order pours for.
 *
 * Phase 1–2: mock role-based filtering against the org's project list.
 *
 * Phase 3 migration path:
 *   Replace the body of getJobsitesForUser with a Supabase query:
 *     SELECT project_id FROM project_members
 *     WHERE user_id = userId AND org_id = orgId
 *   Then filter allOrgProjects to that set.
 *   Admin/owner roles can bypass the membership check via RLS policy.
 *
 * Org scoping:
 *   The orgId parameter is the authoritative scope boundary. In Phase 3
 *   all queries are filtered by org_id so no cross-tenant data is possible.
 *   In Phase 1–2 the org boundary is enforced by the OrgProvider — only
 *   projects that belong to the current org are passed in as allOrgProjects.
 */

import type { ProjectContext, UserRole } from "@/types/org";

// ── Role sets ─────────────────────────────────────────────────────────────────

/** Office / oversight roles — see all org projects. */
const FULL_ACCESS_ROLES: readonly UserRole[] = [
  "owner", "admin", "pm", "project_engineer",
];

// ── Mock field-role assignments ───────────────────────────────────────────────
// Key: userId → list of project IDs they are assigned to.
// In Phase 3 this table is replaced by project_members in Supabase.

const MOCK_FIELD_ASSIGNMENTS: Record<string, string[]> = {
  // Dan Ortega (appears in pour seed data as creator)
  "user_foreman_001": [
    "proj_riverside_006",
  ],
  // Tony Reeves — mechanic persona (cru_w_001), assigned to Highland Tower
  "cru_w_001": [
    "proj_highland_002",   // Highland Tower — Phase 2
  ],
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the jobsites (projects) a user may request pours for.
 *
 * @param orgId         - Current org — used as the scope key in Phase 3.
 * @param userId        - Current user ID.
 * @param role          - Current user role (may differ from the user's base role
 *                        during mock role-switching).
 * @param allOrgProjects - Full project list for this org, already org-scoped by
 *                         the caller (OrgProvider.availableProjects).
 */
export function getJobsitesForUser(
  orgId:           string,
  userId:          string,
  role:            UserRole,
  allOrgProjects:  ProjectContext[],
): ProjectContext[] {
  // Suppress lint warning — orgId is the Phase 3 query key; kept in signature
  // so callers are already wired correctly before the backend exists.
  void orgId;

  if ((FULL_ACCESS_ROLES as readonly string[]).includes(role)) {
    return allOrgProjects;
  }

  const assigned = MOCK_FIELD_ASSIGNMENTS[userId];
  if (assigned && assigned.length > 0) {
    return allOrgProjects.filter((p) => assigned.includes(p.id));
  }

  // Fallback: restrict to the first active project (safe default for unknown users).
  return allOrgProjects.slice(0, 1);
}
