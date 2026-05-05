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
import { fetchOrgUser }        from "@/lib/supabase/org-users";
import { getSessionUser }      from "@/lib/supabase/ssr";
import {
  fetchOrgWorkerProjectRoles,
  fetchWorkerByUserId,
  fetchWorkerPositions,
} from "@/lib/supabase/worker-project-roles";
import type { WorkerProjectRole } from "@/types/domain";
import { ShellClientRoot }     from "./shell-client";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export default async function ShellRootLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getSessionUser();

  const [workers, projects, assets, crews, issues, alerts, activity, mxWorkOrders, pours, requests, tasks, assignments, workerProjectRoles] = await Promise.all([
    fetchOrgWorkers(ORG_ID),
    fetchOrgProjects(ORG_ID),
    fetchOrgAssets(ORG_ID),
    fetchOrgCrews(ORG_ID),
    fetchOrgIssues(ORG_ID),
    fetchOrgAlerts(ORG_ID),
    fetchOrgActivity(ORG_ID),
    fetchOrgMxWorkOrders(ORG_ID),
    fetchOrgPours(ORG_ID),
    fetchOrgRequests(ORG_ID),
    fetchOrgTasks(ORG_ID),
    fetchOrgAssignments(ORG_ID),
    fetchOrgWorkerProjectRoles(ORG_ID),
  ]);

  const orgUser = sessionUser
    ? await fetchOrgUser(ORG_ID, sessionUser.id)
    : null;

  const sessionWorker = sessionUser
    ? await fetchWorkerByUserId(ORG_ID, sessionUser.id)
    : null;
  const sessionWorkerPositions: WorkerProjectRole[] = sessionWorker
    ? await fetchWorkerPositions(sessionWorker.id)
    : [];

  return (
    <ShellClientRoot
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
