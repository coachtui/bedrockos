"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Upload, List, MessageSquare, ExternalLink, CalendarDays } from "lucide-react";
import { useSchedule }                    from "@/hooks/schedule/useSchedule";
import { ActivityList }                   from "./ActivityList";
import { ScheduleChat }                   from "./ScheduleChat";
import { CsvUploadPanel }                 from "./CsvUploadPanel";
import { useOrg }                         from "@/providers/OrgProvider";
import { serverFetchCxTasksByProject }    from "@/lib/actions/cx-tasks";
import { serverUpdateTask }               from "@/lib/actions/cx-tasks";
import type { UserRole }                  from "@/types/org";
import type { CxTask }                    from "@/lib/cx/types";
import type { ScheduleActivity, ScheduleMutation } from "@/lib/schedule/types";

const SCHEDULE_ACTING_ROLES: UserRole[] = [
  "owner", "admin", "equipment_director", "operations_manager",
  "pm", "project_engineer", "superintendent",
];

interface Props {
  projectId: string;
  role:      UserRole;
}

// ── CxTask → ScheduleActivity mapping ────────────────────────────────────────

function cxTaskToActivity(task: CxTask): ScheduleActivity {
  const today     = new Date().toISOString().split("T")[0];
  const startDate = task.startDate ?? today;
  const endDate   = task.endDate   ?? startDate;
  const start     = new Date(startDate);
  const end       = new Date(endDate);
  const duration  = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

  const statusMap = {
    not_started: "upcoming",
    in_progress:  "active",
    on_hold:      "delayed",
    complete:     "complete",
  } as const;

  return {
    id:        task.id,
    projectId: task.projectId,
    name:      task.name,
    phase:     task.type,
    startDate,
    endDate,
    duration,
    status:    statusMap[task.status],
    notes:     task.notes ? [task.notes] : [],
  };
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] min-h-[500px] gap-4 text-center px-6">
      <CalendarDays size={32} className="text-content-muted opacity-40" />
      <div>
        <p className="text-content-primary font-semibold text-sm mb-1">No schedule for this project yet</p>
        <p className="text-content-muted text-xs">Create tasks in the CX module or import an existing schedule.</p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/modules/cru/schedule"
          className="flex items-center gap-1.5 text-xs font-semibold bg-teal/10 text-teal border border-teal/30 px-4 py-2 rounded-lg hover:bg-teal/20 transition-colors"
        >
          <ExternalLink size={11} /> Open CX Schedule
        </Link>
        <button
          onClick={onImport}
          className="flex items-center gap-1.5 text-xs font-semibold text-content-muted border border-surface-border px-4 py-2 rounded-lg hover:border-teal/40 hover:text-teal transition-colors"
        >
          <Upload size={11} /> Import from CSV
        </button>
      </div>
    </div>
  );
}

// ── Inner component — receives real tasks, calls useSchedule ─────────────────

interface InnerProps {
  projectId: string;
  orgId:     string;
  role:      UserRole;
  cxTasks:   CxTask[];
}

function ScheduleTabInner({ projectId, orgId, role, cxTasks }: InnerProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [mobileTab,  setMobileTab]  = useState<"chat" | "schedule">("chat");

  const canAct    = SCHEDULE_ACTING_ROLES.includes(role);
  const canUpdate = (["owner", "admin", "equipment_director", "operations_manager", "pm", "project_engineer"] as UserRole[]).includes(role);

  const initialActivities = useMemo(() => cxTasks.map(cxTaskToActivity), [cxTasks]);

  const handleMutate = useCallback(async (mutation: ScheduleMutation) => {
    if (mutation.type === "mark_complete") {
      await serverUpdateTask(orgId, mutation.activityId, { status: "complete" });
    } else if (mutation.type === "push_date") {
      await serverUpdateTask(orgId, mutation.activityId, {
        startDate: mutation.newStartDate,
        endDate:   mutation.newEndDate,
      });
    }
  }, [orgId]);

  const {
    schedule, activities, messages,
    uploadSchedule, generateLookahead,
    markActivityComplete, pushActivity,
    confirmCascade, dismissCascade, postMessage,
  } = useSchedule(projectId, initialActivities, handleMutate);

  const chatProps = {
    messages,
    activities,
    canAct,
    onPostMessage:       postMessage,
    onMarkComplete:      markActivityComplete,
    onPush:              pushActivity,
    onConfirmCascade:    confirmCascade,
    onDismissCascade:    dismissCascade,
    onGenerateLookahead: generateLookahead,
  };

  if (showUpload) {
    return (
      <div className="max-w-lg mx-auto mt-6">
        <div className="border border-surface-border rounded-[var(--radius-card)] overflow-hidden">
          <CsvUploadPanel
            projectId={projectId}
            onUpload={(text, map) => { uploadSchedule(text, map); setShowUpload(false); }}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <p className="text-xs text-content-muted flex-1">
          {activities.length} activities · last updated{" "}
          {new Date(schedule.lastUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
        {canUpdate && (
          <Link
            href="/modules/cru/schedule"
            className="flex items-center gap-1.5 text-xs font-semibold text-content-muted border border-surface-border rounded-lg px-3 py-1.5 hover:border-teal/40 hover:text-teal transition-colors"
          >
            <ExternalLink size={11} /> Update Schedule
          </Link>
        )}
        {/* Mobile tab switcher */}
        <div className="flex lg:hidden border border-surface-border rounded-lg overflow-hidden">
          <button
            onClick={() => setMobileTab("chat")}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors ${
              mobileTab === "chat"
                ? "bg-teal text-white"
                : "text-content-muted hover:text-content-secondary"
            }`}
          >
            <MessageSquare size={11} /> Chat
          </button>
          <button
            onClick={() => setMobileTab("schedule")}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors ${
              mobileTab === "schedule"
                ? "bg-teal text-white"
                : "text-content-muted hover:text-content-secondary"
            }`}
          >
            <List size={11} /> Schedule
          </button>
        </div>
      </div>

      {/* Two-pane desktop / tab-switched mobile */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className={`flex-1 overflow-y-auto ${mobileTab === "schedule" ? "block" : "hidden"} lg:block`}>
          <ActivityList activities={activities} />
        </div>
        <div className={`lg:w-[420px] border border-surface-border rounded-[var(--radius-card)] overflow-hidden flex flex-col ${
          mobileTab === "chat" ? "flex" : "hidden"
        } lg:flex`}>
          <ScheduleChat {...chatProps} />
        </div>
      </div>
    </div>
  );
}

// ── Loader shell — exported component ────────────────────────────────────────

export function ScheduleTab({ projectId, role }: Props) {
  const { currentOrganization } = useOrg();
  const orgId = currentOrganization.id;

  const [cxTasks, setCxTasks] = useState<CxTask[] | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    setCxTasks(null);
    serverFetchCxTasksByProject(orgId, projectId)
      .then(setCxTasks)
      .catch(() => setCxTasks([]));
  }, [orgId, projectId]);

  if (cxTasks === null) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-220px)] min-h-[500px]">
        <p className="text-content-muted text-xs">Loading schedule…</p>
      </div>
    );
  }

  if (showUpload) {
    return (
      <div className="max-w-lg mx-auto mt-6">
        <div className="border border-surface-border rounded-[var(--radius-card)] overflow-hidden">
          <CsvUploadPanel
            projectId={projectId}
            onUpload={(_text, _map) => setShowUpload(false)}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      </div>
    );
  }

  if (cxTasks.length === 0) {
    return <EmptyState onImport={() => setShowUpload(true)} />;
  }

  return (
    <ScheduleTabInner
      projectId={projectId}
      orgId={orgId}
      role={role}
      cxTasks={cxTasks}
    />
  );
}
