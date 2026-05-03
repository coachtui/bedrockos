"use client";

import { OrgProvider }    from "@/providers/OrgProvider";
import { UIProvider }     from "@/providers/UIProvider";
import { MxProvider }     from "@/providers/MxProvider";
import { OpsProvider }    from "@/providers/OpsProvider";
import { CxProvider }     from "@/providers/CxProvider";
import { ThemeProvider }  from "@/providers/ThemeProvider";
import { Sidebar }        from "@/components/layout/Sidebar";
import { Topbar }         from "@/components/layout/Topbar";
import { MobileNav }      from "@/components/layout/MobileNav";
import { AssistantPanel } from "@/components/layout/AssistantPanel";
import { SearchModal }    from "@/components/search/SearchModal";
import { useUI }          from "@/providers/UIProvider";
import { useMx }          from "@/providers/MxProvider";
import type { OrgWorker, Project, OrgCrew, WorkerProjectRole } from "@/types/domain";
import type { OrgUserRow }                                     from "@/lib/supabase/org-users";
import type { CxTask, CxDayAssignment }                        from "@/lib/cx/types";

function OpsLayer({ children }: { children: React.ReactNode }) {
  const { createWorkOrder } = useMx();
  return (
    <OpsProvider onCreateMxWorkOrder={createWorkOrder}>
      {children}
    </OpsProvider>
  );
}

function ShellLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUI();
  return (
    <>
      <Sidebar />
      <Topbar />
      <main className={`min-h-screen pt-14 transition-all duration-200 ease-in-out pl-0 ${sidebarCollapsed ? "md:pl-16" : "md:pl-60"}`}>
        <div className="pb-20 md:pb-0">{children}</div>
      </main>
      <AssistantPanel />
      <SearchModal />
      <MobileNav />
    </>
  );
}

export function ShellClientRoot({
  children,
  initialWorkers,
  initialProjects,
  initialCrews,
  initialTasks,
  initialAssignments,
  initialUser,
  initialWorkerProjectRoles,
  initialWorkerPositions,
}: {
  children:                   React.ReactNode;
  initialWorkers:             OrgWorker[];
  initialProjects:            Project[];
  initialCrews:               OrgCrew[];
  initialTasks:               CxTask[];
  initialAssignments:         CxDayAssignment[];
  initialUser?:               OrgUserRow;
  initialWorkerProjectRoles:  WorkerProjectRole[];
  initialWorkerPositions:     WorkerProjectRole[];
}) {
  return (
    <ThemeProvider>
      <OrgProvider initialWorkers={initialWorkers} initialProjects={initialProjects} initialCrews={initialCrews} initialUser={initialUser} initialWorkerProjectRoles={initialWorkerProjectRoles} initialWorkerPositions={initialWorkerPositions}>
        <UIProvider>
          <CxProvider initialTasks={initialTasks} initialAssignments={initialAssignments}>
            <MxProvider>
              <OpsLayer>
                <ShellLayout>{children}</ShellLayout>
              </OpsLayer>
            </MxProvider>
          </CxProvider>
        </UIProvider>
      </OrgProvider>
    </ThemeProvider>
  );
}
