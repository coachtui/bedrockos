"use client";

import React, { useState } from "react";
import { Upload, List, MessageSquare } from "lucide-react";
import { useSchedule }     from "@/hooks/schedule/useSchedule";
import { ActivityList }    from "./ActivityList";
import { ScheduleChat }    from "./ScheduleChat";
import { CsvUploadPanel }  from "./CsvUploadPanel";
import type { UserRole }   from "@/types/org";

const SCHEDULE_ACTING_ROLES: UserRole[] = ["owner", "admin", "equipment_director", "operations_manager", "pm", "project_engineer", "superintendent"];

interface Props {
  projectId: string;
  role:      UserRole;
}

export function ScheduleTab({ projectId, role }: Props) {
  const {
    schedule, activities, messages,
    uploadSchedule, generateLookahead,
    markActivityComplete, pushActivity,
    confirmCascade, dismissCascade, postMessage,
  } = useSchedule(projectId);

  const [showUpload,  setShowUpload]  = useState(false);
  const [mobileTab,   setMobileTab]   = useState<"chat" | "schedule">("chat");

  const canAct = SCHEDULE_ACTING_ROLES.includes(role);
  const canUpload = (["owner", "admin", "equipment_director", "operations_manager", "pm", "project_engineer"] as UserRole[]).includes(role);

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
        {canUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-content-muted border border-surface-border rounded-lg px-3 py-1.5 hover:border-teal/40 hover:text-teal transition-colors"
          >
            <Upload size={11} /> Update Schedule
          </button>
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
        {/* Activity list — desktop left, mobile conditional */}
        <div className={`flex-1 overflow-y-auto ${mobileTab === "schedule" ? "block" : "hidden"} lg:block`}>
          <ActivityList activities={activities} />
        </div>

        {/* Chat — desktop right, mobile conditional */}
        <div className={`lg:w-[420px] border border-surface-border rounded-[var(--radius-card)] overflow-hidden flex flex-col ${
          mobileTab === "chat" ? "flex" : "hidden"
        } lg:flex`}>
          <ScheduleChat {...chatProps} />
        </div>
      </div>
    </div>
  );
}
