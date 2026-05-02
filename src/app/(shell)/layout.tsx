import { fetchOrgWorkers }  from "@/lib/supabase/workers";
import { fetchOrgProjects } from "@/lib/supabase/projects";
import { fetchOrgCrews }    from "@/lib/supabase/crews";
import { fetchOrgUser }     from "@/lib/supabase/org-users";
import { getSessionUser }   from "@/lib/supabase/ssr";
import { ShellClientRoot }  from "./shell-client";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export default async function ShellRootLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getSessionUser();

  const [workers, projects, crews] = await Promise.all([
    fetchOrgWorkers(ORG_ID),
    fetchOrgProjects(ORG_ID),
    fetchOrgCrews(ORG_ID),
  ]);

  const orgUser = sessionUser
    ? await fetchOrgUser(ORG_ID, sessionUser.id)
    : null;

  return (
    <ShellClientRoot
      initialWorkers={workers}
      initialProjects={projects}
      initialCrews={crews}
      initialUser={orgUser ?? undefined}
    >
      {children}
    </ShellClientRoot>
  );
}
