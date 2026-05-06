"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import { ArrowLeft, Plus } from "lucide-react";
import { localDateString } from "@/lib/utils/time";

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

export default function AssignmentsPage() {
  const { workers, projects, currentProject, role } = useOrg();
  const { assignments, addAssignment, removeAssignment } = useCx();

  const weekDates = useMemo(() => getWeekDates(new Date()), []);

  const relevantWorkerIds = useMemo(() => {
    const ids = new Set<string>();
    // Workers primary to this project
    workers.filter((w) => w.projectId === currentProject.id).forEach((w) => ids.add(w.id));
    // Workers with any assignment to this project this week
    assignments
      .filter((a) => weekDates.includes(a.date) && a.projectId === currentProject.id)
      .forEach((a) => ids.add(a.workerId));
    return ids;
  }, [workers, assignments, weekDates, currentProject.id]);

  const relevantWorkers = workers.filter((w) => relevantWorkerIds.has(w.id));

  const assignmentDetailMap = useMemo(() => {
    const map: Record<string, Record<string, { id: string; projectName: string; isThisProject: boolean }>> = {};
    for (const a of assignments) {
      if (!weekDates.includes(a.date)) continue;
      if (!map[a.workerId]) map[a.workerId] = {};
      const project = projects.find((p) => p.id === a.projectId);
      map[a.workerId][a.date] = {
        id:            a.id,
        projectName:   project?.name ?? a.projectId,
        isThisProject: a.projectId === currentProject.id,
      };
    }
    return map;
  }, [assignments, weekDates, projects, currentProject.id]);

  const today = localDateString();
  // pm included here (day-level assignment = crew scheduling), consistent with CAN_CREATE_ROLES in crews/page.tsx
  const canEdit = role === "superintendent" || role === "project_engineer" || role === "pm" || role === "owner" || role === "admin";

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
              {weekDates.map((date, i) => (
                <th
                  key={date}
                  className={`text-center text-[10px] font-bold uppercase tracking-widest pb-2 px-1 ${
                    date === today ? "text-gold" : "text-content-muted"
                  }`}
                >
                  {DAY_SHORT[i]}
                  <div className={`text-[11px] font-normal normal-case mt-0.5 ${date === today ? "text-gold" : "text-content-muted"}`}>
                    {date.slice(5)}
                  </div>
                </th>
              ))}
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
                  return (
                    <td key={date} className={`text-center py-2 px-1 ${date === today ? "bg-gold/5" : ""}`}>
                      {(() => {
                        const detail = assignmentDetailMap[worker.id]?.[date];
                        if (detail) {
                          if (detail.isThisProject && canEdit) {
                            return (
                              <button
                                onClick={() => removeAssignment(detail.id)}
                                className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded truncate max-w-[80px] text-gold bg-gold/10 border border-gold/20 hover:border-red-400/40 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                                title={`Remove ${worker.name} from ${detail.projectName} on ${date}`}
                              >
                                {detail.projectName.split(" ")[0]}
                              </button>
                            );
                          }
                          return (
                            <span
                              className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded truncate max-w-[80px] cursor-default ${
                                detail.isThisProject
                                  ? "text-gold bg-gold/10 border border-gold/20"
                                  : "text-content-muted bg-surface-overlay border border-surface-border"
                              }`}
                              title={detail.projectName}
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
