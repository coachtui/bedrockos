"use client";

import React, { useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, Circle, ChevronDown, ChevronRight } from "lucide-react";
import type { ScheduleActivity, ScheduleActivityStatus } from "@/lib/schedule/types";
import { formatDisplayDate } from "@/lib/schedule/utils";

const STATUS_CONFIG: Record<
  ScheduleActivityStatus,
  { label: string; icon: React.ReactNode; pill: string }
> = {
  complete: {
    label: "Complete",
    icon:  <CheckCircle2 size={12} className="text-status-success" />,
    pill:  "text-status-success bg-status-success/10 border-status-success/20",
  },
  active: {
    label: "Active",
    icon:  <Clock size={12} className="text-teal" />,
    pill:  "text-teal bg-teal/10 border-teal/20",
  },
  delayed: {
    label: "Delayed",
    icon:  <AlertTriangle size={12} className="text-status-warning" />,
    pill:  "text-status-warning bg-status-warning/10 border-status-warning/20",
  },
  upcoming: {
    label: "Upcoming",
    icon:  <Circle size={12} className="text-content-muted" />,
    pill:  "text-content-muted bg-surface-overlay border-surface-border",
  },
};

function groupByPhase(activities: ScheduleActivity[]): Record<string, ScheduleActivity[]> {
  return activities.reduce<Record<string, ScheduleActivity[]>>((acc, a) => {
    (acc[a.phase] ??= []).push(a);
    return acc;
  }, {});
}

function ActivityRow({ activity }: { activity: ScheduleActivity }) {
  const cfg = STATUS_CONFIG[activity.status];
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-t border-surface-border hover:bg-surface-overlay transition-colors">
      <div className="shrink-0">{cfg.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-content-primary truncate">{activity.name}</p>
        <p className="text-[11px] text-content-muted mt-0.5">
          {formatDisplayDate(activity.startDate)} – {formatDisplayDate(activity.endDate)}
          {activity.pushedDays && activity.pushedDays > 0
            ? <span className="ml-2 text-status-warning">+{activity.pushedDays}d</span>
            : null}
        </p>
      </div>
      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wide ${cfg.pill}`}>
        {cfg.label}
      </span>
    </div>
  );
}

function PhaseGroup({ phase, activities }: { phase: string; activities: ScheduleActivity[] }) {
  const [open, setOpen] = useState(true);
  const completeCount = activities.filter((a) => a.status === "complete").length;

  return (
    <div className="border border-surface-border rounded-[var(--radius-card)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-surface-raised hover:bg-surface-overlay transition-colors text-left"
      >
        {open ? <ChevronDown size={13} className="text-content-muted" /> : <ChevronRight size={13} className="text-content-muted" />}
        <span className="text-[11px] font-bold uppercase tracking-widest text-content-secondary flex-1">
          {phase}
        </span>
        <span className="text-[11px] text-content-muted">
          {completeCount}/{activities.length}
        </span>
      </button>
      {open && (
        <div>
          {activities.map((a) => <ActivityRow key={a.id} activity={a} />)}
        </div>
      )}
    </div>
  );
}

export function ActivityList({ activities }: { activities: ScheduleActivity[] }) {
  const grouped = groupByPhase(activities);

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-content-muted">No schedule uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([phase, acts]) => (
        <PhaseGroup key={phase} phase={phase} activities={acts} />
      ))}
    </div>
  );
}
