"use client";

import React, { useCallback } from "react";
import { OrgProvider, useOrg } from "@/providers/OrgProvider";
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
import type { Asset, OrgWorker, Project, OrgCrew, WorkerProjectRole, Issue, Alert, ActivityEvent } from "@/types/domain";
import type { OrgUserRow }                                     from "@/lib/supabase/org-users";
import type { CxTask, CxDayAssignment }                        from "@/lib/cx/types";
import type { MxWorkOrder }                                    from "@/lib/mx/types";
import type { PourEvent, Request as OpsRequest }               from "@/lib/ops/types";

function useShellActivityEmitter() {
  const { addEmittedActivity, currentUser } = useOrg();
  return useCallback((partial: Omit<ActivityEvent, "id" | "timestamp" | "actor_name"> & { actor_name?: string }) => {
    addEmittedActivity({
      id:         crypto.randomUUID(),
      timestamp:  new Date().toISOString(),
      actor_name: currentUser.name,
      ...partial,
    });
  }, [addEmittedActivity, currentUser.name]);
}

function MxLayer({ children, initialWorkOrders }: { children: React.ReactNode; initialWorkOrders: MxWorkOrder[] }) {
  const onEmitActivity = useShellActivityEmitter();
  return (
    <MxProvider initialWorkOrders={initialWorkOrders} onEmitActivity={onEmitActivity}>
      {children}
    </MxProvider>
  );
}

function OpsLayer({
  children,
  initialPours,
  initialRequests,
}: {
  children:        React.ReactNode;
  initialPours:    PourEvent[];
  initialRequests: OpsRequest[];
}) {
  const { createWorkOrder } = useMx();
  const onEmitActivity = useShellActivityEmitter();
  return (
    <OpsProvider
      onCreateMxWorkOrder={createWorkOrder}
      onEmitActivity={onEmitActivity}
      initialPours={initialPours}
      initialRequests={initialRequests}
    >
      {children}
    </OpsProvider>
  );
}

function ShellLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUI();
  return (
    <>
      <div className="print:hidden">
        <Sidebar />
        <Topbar />
      </div>
      <main className={`min-h-screen pt-14 print:pt-0 print:pl-0 transition-all duration-200 ease-in-out pl-0 ${sidebarCollapsed ? "md:pl-16" : "md:pl-60"}`}>
        <div className="pb-20 md:pb-0 print:pb-0">{children}</div>
      </main>
      <div className="print:hidden">
        <AssistantPanel />
        <SearchModal />
        <MobileNav />
      </div>
    </>
  );
}

export function ShellClientRoot({
  children,
  initialWorkers,
  initialProjects,
  initialAssets,
  initialCrews,
  initialIssues,
  initialAlerts,
  initialActivity,
  initialMxWorkOrders,
  initialPours,
  initialRequests,
  initialTasks,
  initialAssignments,
  initialUser,
  initialWorkerProjectRoles,
  initialWorkerPositions,
}: {
  children:                   React.ReactNode;
  initialWorkers:             OrgWorker[];
  initialProjects:            Project[];
  initialAssets:              Asset[];
  initialCrews:               OrgCrew[];
  initialIssues:              Issue[];
  initialAlerts:              Alert[];
  initialActivity:            ActivityEvent[];
  initialMxWorkOrders:        MxWorkOrder[];
  initialPours:               PourEvent[];
  initialRequests:            OpsRequest[];
  initialTasks:               CxTask[];
  initialAssignments:         CxDayAssignment[];
  initialUser?:               OrgUserRow;
  initialWorkerProjectRoles:  WorkerProjectRole[];
  initialWorkerPositions:     WorkerProjectRole[];
}) {
  return (
    <ThemeProvider>
      <OrgProvider initialWorkers={initialWorkers} initialProjects={initialProjects} initialAssets={initialAssets} initialCrews={initialCrews} initialIssues={initialIssues} initialAlerts={initialAlerts} initialActivity={initialActivity} initialUser={initialUser} initialWorkerProjectRoles={initialWorkerProjectRoles} initialWorkerPositions={initialWorkerPositions}>
        <UIProvider>
          <CxProvider initialTasks={initialTasks} initialAssignments={initialAssignments}>
            <MxLayer initialWorkOrders={initialMxWorkOrders}>
              <OpsLayer initialPours={initialPours} initialRequests={initialRequests}>
                <ShellLayout>{children}</ShellLayout>
              </OpsLayer>
            </MxLayer>
          </CxProvider>
        </UIProvider>
      </OrgProvider>
    </ThemeProvider>
  );
}
