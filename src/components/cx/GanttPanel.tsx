"use client";

import { MapPin } from "lucide-react";
import { StaffingBadge } from "@/components/cx/StaffingBadge";
import { getStaffingStatus } from "@/lib/cx/staffing";
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
  tasks:       CxTask[];
  projectId:   string;
  workers:     OrgWorker[];
  today:       string;
  monday:      string;
  onTaskClick: (task: CxTask) => void;
  canEdit:     boolean;
}

export function GanttPanel({ tasks, projectId, workers, today, monday, onTaskClick, canEdit }: GanttPanelProps) {
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
        <div className="flex border-b border-surface-border">
          <div className="w-40 flex-shrink-0" />
          {ganttDates.map((date) => {
            const { dow, date: dateNum } = formatDayHeader(date);
            const staffing = getStaffingStatus(projectTasks, date, workers);
            return (
              <div
                key={date}
                className={`flex-1 text-center py-1 px-0.5 border-l border-surface-border ${date === today ? "bg-gold/5" : ""}`}
              >
                <p className={`text-[9px] font-bold ${date === today ? "text-gold" : "text-content-muted"}`}>{dow}</p>
                <p className={`text-[9px] ${date === today ? "text-gold" : "text-content-muted"}`}>{dateNum}</p>
                <div className="mt-0.5 flex justify-center">
                  <StaffingBadge status={staffing} size="xs" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Task rows */}
        {projectTasks.map((task) => (
          <div key={task.id} className="flex border-b border-surface-border hover:bg-surface-raised/50 group">
            <div
              className={`w-40 flex-shrink-0 px-2 py-2 ${canEdit ? "cursor-pointer" : "cursor-default"}`}
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
              const active  = date >= task.startDate && date <= task.endDate;
              const isStart = date === task.startDate;
              const isEnd   = date === task.endDate;
              return (
                <div
                  key={date}
                  className={`flex-1 border-l border-surface-border py-2 flex items-center ${date === today ? "bg-gold/5" : ""}`}
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
