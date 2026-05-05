"use client";

import { MapPin } from "lucide-react";
import { StaffingBadge } from "@/components/cx/StaffingBadge";
import { getStaffingStatus } from "@/lib/cx/staffing";
import { isNonWorkingDay } from "@/lib/cx/holidays";
import type { CxTask } from "@/lib/cx/types";
import type { OrgWorker } from "@/types/domain";

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function formatDayHeader(dateStr: string): { dow: string; date: string } {
  const d = new Date(dateStr + "T12:00:00");
  return {
    dow:  d.toLocaleDateString("en-US", { weekday: "short" }),
    date: d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
  };
}

interface GanttPanelProps {
  tasks:                CxTask[];
  projectId:            string;
  workers:              OrgWorker[];
  today:                string;
  monday:               string;
  onTaskClick:          (task: CxTask) => void;
  canEdit:              boolean;
  workingHolidayDates?: string[];
}

const GRID_COLS = "160px repeat(14, minmax(0, 1fr))";

export function GanttPanel({
  tasks,
  projectId,
  workers,
  today,
  monday,
  onTaskClick,
  canEdit,
  workingHolidayDates = [],
}: GanttPanelProps) {
  const ganttDates   = Array.from({ length: 14 }, (_, i) => addDays(monday, i));
  const projectTasks = tasks.filter(
    (t): t is CxTask & { startDate: string; endDate: string } =>
      t.projectId === projectId &&
      t.status !== "complete" &&
      !!t.startDate &&
      !!t.endDate,
  );

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: "700px" }}>

        {/* Date header */}
        <div
          className="border-b border-surface-border"
          style={{ display: "grid", gridTemplateColumns: GRID_COLS }}
        >
          <div className="w-40" />
          {ganttDates.map((date) => {
            const nonWorking = isNonWorkingDay(date, workingHolidayDates);
            const { dow, date: dateNum } = formatDayHeader(date);
            const staffing = nonWorking ? null : getStaffingStatus(projectTasks, date, workers);
            return (
              <div
                key={date}
                className={[
                  "text-center py-1 px-0.5 border-l border-surface-border",
                  nonWorking
                    ? "bg-surface-raised/60"
                    : date === today
                    ? "bg-gold/5"
                    : "",
                ].join(" ")}
              >
                <p className={`text-[9px] font-bold ${nonWorking ? "text-content-subtle" : date === today ? "text-gold" : "text-content-muted"}`}>
                  {dow}
                </p>
                <p className={`text-[9px] ${nonWorking ? "text-content-subtle" : date === today ? "text-gold" : "text-content-muted"}`}>
                  {dateNum}
                </p>
                {!nonWorking && staffing && (
                  <div className="mt-0.5 flex justify-center">
                    <StaffingBadge status={staffing} size="xs" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Task rows */}
        {projectTasks.map((task) => (
          <div
            key={task.id}
            className="border-b border-surface-border hover:bg-surface-raised/50 group"
            style={{ display: "grid", gridTemplateColumns: GRID_COLS }}
          >
            <div
              className={`px-2 py-2 ${canEdit ? "cursor-pointer" : "cursor-default"}`}
              onClick={() => onTaskClick(task)}
            >
              <p className="text-xs font-semibold text-content-primary truncate group-hover:text-gold transition-colors">
                {task.name}
              </p>
              {task.location && (
                <p className="text-[9px] text-content-muted flex items-center gap-0.5 mt-0.5">
                  <MapPin size={8} />{task.location}
                </p>
              )}
            </div>
            {ganttDates.map((date) => {
              const nonWorking = isNonWorkingDay(date, workingHolidayDates);
              const active     = !nonWorking && date >= task.startDate && date <= task.endDate;

              const prevDate   = addDays(date, -1);
              const nextDate   = addDays(date, 1);
              const prevActive = !isNonWorkingDay(prevDate, workingHolidayDates)
                && prevDate >= task.startDate && prevDate <= task.endDate;
              const nextActive = !isNonWorkingDay(nextDate, workingHolidayDates)
                && nextDate >= task.startDate && nextDate <= task.endDate;
              const isStart    = active && !prevActive;
              const isEnd      = active && !nextActive;

              return (
                <div
                  key={date}
                  className={[
                    "border-l border-surface-border py-2 flex items-center",
                    nonWorking
                      ? "bg-surface-raised/60"
                      : date === today
                      ? "bg-gold/5"
                      : "",
                  ].join(" ")}
                >
                  {active && (
                    <div
                      className={[
                        "h-4 w-full bg-gold/25 border-t border-b border-gold/40",
                        isStart ? "rounded-l-full ml-1 border-l border-gold/40" : "",
                        isEnd   ? "rounded-r-full mr-1 border-r border-gold/40" : "",
                      ].join(" ")}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {projectTasks.length === 0 && (
          <p className="text-sm text-content-muted py-8 text-center">
            No scheduled tasks yet. Set dates on draft tasks to see them here.
          </p>
        )}
      </div>
    </div>
  );
}
