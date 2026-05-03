import { fetchOrgWorkers }     from "@/lib/supabase/workers";
import { fetchOrgProjects }    from "@/lib/supabase/projects";
import { fetchOrgCrews }       from "@/lib/supabase/crews";
import { fetchOrgTasks }       from "@/lib/supabase/cx-tasks";
import { fetchOrgAssignments } from "@/lib/supabase/cx-assignments";
import { fetchOrgUser }        from "@/lib/supabase/org-users";
import { getSessionUser }      from "@/lib/supabase/ssr";
import { ShellClientRoot }     from "./shell-client";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export default async function ShellRootLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getSessionUser();

  const [workers, projects, crews, tasks, assignments] = await Promise.all([
    fetchOrgWorkers(ORG_ID),
    fetchOrgProjects(ORG_ID),
    fetchOrgCrews(ORG_ID),
    fetchOrgTasks(ORG_ID),
    fetchOrgAssignments(ORG_ID),
  ]);

  const orgUser = sessionUser
    ? await fetchOrgUser(ORG_ID, sessionUser.id)
    : null;

  return (
    <ShellClientRoot
      initialWorkers={workers}
      initialProjects={projects}
      initialCrews={crews}
      initialTasks={tasks}
      initialAssignments={assignments}
      initialUser={orgUser ?? undefined}
    >
      {children}
    </ShellClientRoot>
  );
}
