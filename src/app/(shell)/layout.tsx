import { fetchOrgWorkers }     from "@/lib/supabase/workers";
import { fetchOrgProjects }    from "@/lib/supabase/projects";
import { fetchOrgAssets }      from "@/lib/supabase/assets";
import { fetchOrgCrews }       from "@/lib/supabase/crews";
import { fetchOrgIssues }      from "@/lib/supabase/issues";
import { fetchOrgAlerts }      from "@/lib/supabase/alerts";
import { fetchOrgActivity }    from "@/lib/supabase/activity";
import { fetchOrgMxWorkOrders } from "@/lib/supabase/mx-work-orders";
import { fetchOrgPours }        from "@/lib/supabase/ops-pours";
import { fetchOrgRequests }     from "@/lib/supabase/ops-requests";
import { fetchOrgTasks }       from "@/lib/supabase/cx-tasks";
import { fetchOrgAssignments } from "@/lib/supabase/cx-assignments";
import { fetchOrgUserByAuthId } from "@/lib/supabase/org-users";
import { fetchPlatformOrg }     from "@/lib/supabase/platform-orgs";
import { getSessionUser }      from "@/lib/supabase/ssr";
import {
  fetchOrgWorkerProjectRoles,
  fetchWorkerByUserId,
  fetchWorkerPositions,
} from "@/lib/supabase/worker-project-roles";
import type { WorkerProjectRole } from "@/types/domain";
import { ShellClientRoot }     from "./shell-client";
import { getEnvOrgId } from "@/lib/config/org";

const FALLBACK_ORG_ID = getEnvOrgId();

export default async function ShellRootLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getSessionUser();

  // Resolve the active org from the signed-in user's org_users record.
  // Fall back to the env var when there is no session (or no membership row).
  const orgUser = sessionUser ? await fetchOrgUserByAuthId(sessionUser.id) : null;
  const activeOrgId = orgUser?.org_id ?? FALLBACK_ORG_ID;

  const [org, workers, projects, assets, crews, issues, alerts, activity, mxWorkOrders, pours, requests, tasks, assignments, workerProjectRoles] = await Promise.all([
    fetchPlatformOrg(activeOrgId),
    fetchOrgWorkers(activeOrgId),
    fetchOrgProjects(activeOrgId),
    fetchOrgAssets(activeOrgId),
    fetchOrgCrews(activeOrgId),
    fetchOrgIssues(activeOrgId),
    fetchOrgAlerts(activeOrgId),
    fetchOrgActivity(activeOrgId),
    fetchOrgMxWorkOrders(activeOrgId),
    fetchOrgPours(activeOrgId),
    fetchOrgRequests(activeOrgId),
    fetchOrgTasks(activeOrgId),
    fetchOrgAssignments(activeOrgId),
    fetchOrgWorkerProjectRoles(activeOrgId),
  ]);

  const sessionWorker = sessionUser
    ? await fetchWorkerByUserId(activeOrgId, sessionUser.id)
    : null;
  const sessionWorkerPositions: WorkerProjectRole[] = sessionWorker
    ? await fetchWorkerPositions(sessionWorker.id)
    : [];

  return (
    <ShellClientRoot
      initialOrg={org}
      initialWorkers={workers}
      initialProjects={projects}
      initialAssets={assets}
      initialCrews={crews}
      initialIssues={issues}
      initialAlerts={alerts}
      initialActivity={activity}
      initialMxWorkOrders={mxWorkOrders}
      initialPours={pours}
      initialRequests={requests}
      initialTasks={tasks}
      initialAssignments={assignments}
      initialUser={orgUser ?? undefined}
      initialWorkerProjectRoles={workerProjectRoles}
      initialWorkerPositions={sessionWorkerPositions}
    >
      {children}
    </ShellClientRoot>
  );
}
