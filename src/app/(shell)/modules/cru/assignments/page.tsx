"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import { ArrowLeft } from "lucide-react";

function getWeekDates(anchor: Date): string[] {
  const day    = anchor.getDay();
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AssignmentsPage() {
  const { workers, projects, currentProject } = useOrg();
  const { assignments } = useCx();

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

  const assignmentMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const a of assignments) {
      if (!weekDates.includes(a.date)) continue;
      if (!map[a.workerId]) map[a.workerId] = {};
      const project = projects.find((p) => p.id === a.projectId);
      map[a.workerId][a.date] = project?.name ?? a.projectId;
    }
    return map;
  }, [assignments, weekDates, projects]);

  const today = new Date().toISOString().split("T")[0];

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
                  const projectName   = assignmentMap[worker.id]?.[date];
                  const isThisProject = projectName === projects.find((p) => p.id === currentProject.id)?.name;
                  return (
                    <td key={date} className={`text-center py-2 px-1 ${date === today ? "bg-gold/5" : ""}`}>
                      {projectName ? (
                        <span
                          className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded truncate max-w-[80px] ${
                            isThisProject
                              ? "text-gold bg-gold/10 border border-gold/20"
                              : "text-content-muted bg-surface-overlay border border-surface-border"
                          }`}
                          title={projectName}
                        >
                          {projectName.split(" ")[0]}
                        </span>
                      ) : (
                        <span className="text-content-muted text-[10px]">—</span>
                      )}
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
