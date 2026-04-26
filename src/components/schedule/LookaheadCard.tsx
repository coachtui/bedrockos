"use client";

import React, { useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, CheckCircle2, ArrowRight } from "lucide-react";
import type { ScheduleMessage, ScheduleActivity } from "@/lib/schedule/types";
import { formatDisplayDate } from "@/lib/schedule/utils";

interface Props {
  message:            ScheduleMessage;
  week1Activities:    ScheduleActivity[];
  week2Activities:    ScheduleActivity[];
  week3Activities:    ScheduleActivity[];
  canAct:             boolean;
  onMarkComplete:     (activityId: string) => void;
  onPush:             (activityId: string, days: number) => void;
}

function ActivityChip({
  activity,
  weekIndex,
  canAct,
  onMarkComplete,
  onPush,
}: {
  activity:       ScheduleActivity;
  weekIndex:      number;
  canAct:         boolean;
  onMarkComplete: (id: string) => void;
  onPush:         (id: string, days: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-t border-teal/10 first:border-t-0">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-content-primary truncate">{activity.name}</p>
        <p className="text-[10px] text-content-muted">
          {activity.phase} · {formatDisplayDate(activity.startDate)}–{formatDisplayDate(activity.endDate)}
        </p>
      </div>
      {canAct && (
        <div className="flex items-center gap-1 shrink-0">
          {weekIndex === 0 && (
            <button
              onClick={() => onMarkComplete(activity.id)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-status-success border border-status-success/30 rounded hover:bg-status-success/10 transition-colors"
            >
              <CheckCircle2 size={9} /> Done
            </button>
          )}
          <button
            onClick={() => onPush(activity.id, 7)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-content-muted border border-surface-border rounded hover:border-status-warning/40 hover:text-status-warning transition-colors"
          >
            <ArrowRight size={9} /> Push
          </button>
        </div>
      )}
    </div>
  );
}

function WeekSection({
  label, activities, weekIndex, canAct, onMarkComplete, onPush,
}: {
  label:          string;
  activities:     ScheduleActivity[];
  weekIndex:      number;
  canAct:         boolean;
  onMarkComplete: (id: string) => void;
  onPush:         (id: string, days: number) => void;
}) {
  const [open, setOpen] = useState(weekIndex === 0);
  return (
    <div className="border border-teal/15 rounded-[var(--radius-card)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-teal/5 text-left"
      >
        {open ? <ChevronDown size={11} className="text-teal" /> : <ChevronRight size={11} className="text-teal" />}
        <span className="text-[10px] font-bold uppercase tracking-widest text-teal flex-1">{label}</span>
        <span className="text-[10px] text-content-muted">{activities.length} activit{activities.length !== 1 ? "ies" : "y"}</span>
      </button>
      {open && (
        <div className="px-3 pb-2">
          {activities.length === 0 ? (
            <p className="text-[10px] text-content-muted py-2">No activities scheduled.</p>
          ) : (
            activities.map((a) => (
              <ActivityChip
                key={a.id}
                activity={a}
                weekIndex={weekIndex}
                canAct={canAct}
                onMarkComplete={onMarkComplete}
                onPush={onPush}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function LookaheadCard({
  message, week1Activities, week2Activities, week3Activities, canAct, onMarkComplete, onPush,
}: Props) {
  return (
    <div className="bg-teal/5 border border-teal/20 rounded-[var(--radius-card)] p-3">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays size={13} className="text-teal" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-teal">3-Week Lookahead</span>
        <span className="ml-auto text-[10px] text-content-muted">
          {new Date(message.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
      <div className="space-y-2">
        <WeekSection label="Week 1 — This Week"  activities={week1Activities} weekIndex={0} canAct={canAct} onMarkComplete={onMarkComplete} onPush={onPush} />
        <WeekSection label="Week 2 — Next Week"  activities={week2Activities} weekIndex={1} canAct={canAct} onMarkComplete={onMarkComplete} onPush={onPush} />
        <WeekSection label="Week 3 — Forecasting" activities={week3Activities} weekIndex={2} canAct={canAct} onMarkComplete={onMarkComplete} onPush={onPush} />
      </div>
    </div>
  );
}
