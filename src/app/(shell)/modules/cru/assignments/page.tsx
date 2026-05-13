"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import { ArrowLeft, Plus } from "lucide-react";
import { localDateString } from "@/lib/utils/time";
import { isNonWorkingDay, GCA_HOLIDAYS_2026 } from "@/lib/cx/holidays";

const HOLIDAY_NAME: Record<string, string> = Object.fromEntries(
  GCA_HOLIDAYS_2026.map((h) => [h.date, h.name]),
);

function getWeekDates(anchor: Date): string[] {
  const day    = anchor.getDay();
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return localDateString(d);
  });
}

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function eachDateBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) return out;
  const cursor = new Date(s);
  while (cursor <= e) {
    out.push(localDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

type AssignmentDetail = {
  id:            string | null;
  projectName:   string;
  isThisProject: boolean;
  source:        "explicit" | "task";
  taskName?:     string;
};

export default function AssignmentsPage() {
  const { workers, projects, currentProject, role } = useOrg();
  const { tasks, assignments, addAssignment, removeAssignment } = useCx();

  const weekDates = useMemo(() => getWeekDates(new Date()), []);
  const workingHolidayDates = projects.find((p) => p.id === currentProject.id)?.working_holiday_dates ?? [];

  const taskDerived = useMemo(() => {
    const rows: Array<{ workerId: string; projectId: string; date: string; taskId: string; taskName: string }> = [];
    for (const t of tasks) {
      if (!t.startDate || !t.endDate || t.assignedWorkerIds.length === 0) continue;
      const days = eachDateBetween(t.startDate, t.endDate).filter((d) => weekDates.includes(d));
      if (days.length === 0) continue;
      for (const wid of t.assignedWorkerIds) {
        for (const d of days) {
          rows.push({ workerId: wid, projectId: t.projectId, date: d, taskId: t.id, taskName: t.name });
        }
      }
    }
    return rows;
  }, [tasks, weekDates]);

  const relevantWorkerIds = useMemo(() => {
    const ids = new Set<string>();
    workers.filter((w) => w.projectId === currentProject.id).forEach((w) => ids.add(w.id));
    assignments
      .filter((a) => weekDates.includes(a.date) && a.projectId === currentProject.id)
      .forEach((a) => ids.add(a.workerId));
    taskDerived
      .filter((r) => r.projectId === currentProject.id)
      .forEach((r) => ids.add(r.workerId));
    return ids;
  }, [workers, assignments, taskDerived, weekDates, currentProject.id]);

  const relevantWorkers = workers.filter((w) => relevantWorkerIds.has(w.id));

  const assignmentDetailMap = useMemo(() => {
    const map: Record<string, Record<string, AssignmentDetail>> = {};
    for (const r of taskDerived) {
      if (!map[r.workerId]) map[r.workerId] = {};
      const project = projects.find((p) => p.id === r.projectId);
      map[r.workerId][r.date] = {
        id:            null,
        projectName:   project?.name ?? r.projectId,
        isThisProject: r.projectId === currentProject.id,
        source:        "task",
        taskName:      r.taskName,
      };
    }
    for (const a of assignments) {
      if (!weekDates.includes(a.date)) continue;
      if (!map[a.workerId]) map[a.workerId] = {};
      const project = projects.find((p) => p.id === a.projectId);
      map[a.workerId][a.date] = {
        id:            a.id,
        projectName:   project?.name ?? a.projectId,
        isThisProject: a.projectId === currentProject.id,
        source:        "explicit",
      };
    }
    return map;
  }, [taskDerived, assignments, weekDates, projects, currentProject.id]);

  const today = localDateString();
  // pm included here (day-level assignment = crew scheduling), consistent with CAN_CREATE_ROLES in crews/page.tsx
  const canEdit = role === "superintendent" || role === "project_engineer" || role === "pm" || role === "owner" || role === "admin" || role === "equipment_director" || role === "operations_manager";

  return (
    <PageContainer maxWidth="wide">
      <div className="mb-4">
        <Link href="/modules/cru" className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors">
          <ArrowLeft size={12} /> CX
        </Link>
      </div>

      <SectionHeader
        title="Assignments"
        subtitle={`Week of ${weekDates[0]} · ${relevantWorkers.length} workers`}
      />

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2 pr-3 w-36">
                Worker
              </th>
              {weekDates.map((date, i) => {
                const nonWorking = isNonWorkingDay(date, workingHolidayDates);
                return (
                  <th
                    key={date}
                    className={`text-center text-[10px] font-bold uppercase tracking-widest pb-2 px-1 ${
                      date === today ? "text-gold" : nonWorking ? "text-content-muted/50" : "text-content-muted"
                    }`}
                  >
                    {DAY_SHORT[i]}
                    <div className={`text-[11px] font-normal normal-case mt-0.5 ${date === today ? "text-gold" : nonWorking ? "text-content-muted/50" : "text-content-muted"}`}>
                      {date.slice(5)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {relevantWorkers.map((worker) => (
              <tr key={worker.id} className="border-t border-surface-border">
                <td className="py-2 pr-3">
                  <p className="font-semibold text-content-primary text-xs">{worker.name}</p>
                  <p className="text-[10px] text-content-muted capitalize">{worker.role}</p>
                </td>
                {weekDates.map((date) => {
                  const nonWorking = isNonWorkingDay(date, workingHolidayDates);
                  const holidayName = HOLIDAY_NAME[date] && !workingHolidayDates.includes(date) ? HOLIDAY_NAME[date] : undefined;
                  return (
                    <td
                      key={date}
                      className={`text-center py-2 px-1 ${
                        date === today
                          ? "bg-gold/5"
                          : nonWorking
                          ? "bg-surface-raised/40 opacity-50"
                          : ""
                      }`}
                      title={holidayName}
                    >
                      {(() => {
                        if (nonWorking) {
                          return <span className="text-content-muted/60 text-[10px]">—</span>;
                        }
                        const detail = assignmentDetailMap[worker.id]?.[date];
                        if (detail) {
                          if (detail.isThisProject && canEdit && detail.source === "explicit" && detail.id) {
                            return (
                              <button
                                onClick={() => removeAssignment(detail.id!)}
                                className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded truncate max-w-[80px] text-gold bg-gold/10 border border-gold/20 hover:border-red-400/40 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                                title={`Remove ${worker.name} from ${detail.projectName} on ${date}`}
                              >
                                {detail.projectName.split(" ")[0]}
                              </button>
                            );
                          }
                          const tooltip = detail.source === "task" && detail.taskName
                            ? `${detail.projectName} · via task "${detail.taskName}" — edit the task to change`
                            : detail.projectName;
                          return (
                            <span
                              className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded truncate max-w-[80px] cursor-default ${
                                detail.isThisProject
                                  ? detail.source === "task"
                                    ? "text-gold bg-gold/5 border border-gold/30 border-dashed"
                                    : "text-gold bg-gold/10 border border-gold/20"
                                  : "text-content-muted bg-surface-overlay border border-surface-border"
                              }`}
                              title={tooltip}
                            >
                              {detail.projectName.split(" ")[0]}
                            </span>
                          );
                        }
                        if (canEdit) {
                          return (
                            <button
                              onClick={() => addAssignment({ workerId: worker.id, projectId: currentProject.id, date })}
                              className="w-full h-6 flex items-center justify-center text-content-muted opacity-0 hover:opacity-100 hover:text-gold transition-all"
                              title={`Assign ${worker.name} to ${currentProject.name} on ${date}`}
                            >
                              <Plus size={11} />
                            </button>
                          );
                        }
                        return <span className="text-content-muted text-[10px]">—</span>;
                      })()}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {relevantWorkers.length === 0 && (
          <p className="text-sm text-content-muted py-8 text-center">No workers assigned to this project this week.</p>
        )}
      </div>
    </PageContainer>
  );
}
