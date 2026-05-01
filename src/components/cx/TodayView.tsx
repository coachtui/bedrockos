"use client";

import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import { MapPin, Users, ArrowLeft } from "lucide-react";

const TASK_TYPE_LABEL: Record<string, string> = {
  pour:        "Pour",
  inspection:  "Inspection",
  delivery:    "Delivery",
  grading:     "Grading",
  concrete:    "Concrete Work",
  framing:     "Framing",
  electrical:  "Electrical",
  other:       "Other",
};

export function TodayView() {
  const { workers, currentProject } = useOrg();
  const { tasks } = useCx();

  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter(
    (t) =>
      t.projectId === currentProject.id &&
      t.startDate <= today &&
      t.endDate   >= today &&
      t.status !== "complete" &&
      t.status !== "on_hold",
  );

  const formatted = new Date(today + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <PageContainer>
      <div className="mb-4">
        <Link href="/modules/cru" className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors">
          <ArrowLeft size={12} /> CX
        </Link>
      </div>

      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-gold mb-1">Today</p>
        <h1 className="text-xl font-bold text-content-primary">{formatted}</h1>
        <p className="text-sm text-content-secondary mt-0.5">{currentProject.name}</p>
      </div>

      {todayTasks.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-content-muted text-sm">No tasks scheduled for today.</p>
        </div>
      )}

      <div className="space-y-3">
        {todayTasks.map((task) => {
          const assignedWorkers = workers.filter((w) => task.assignedWorkerIds.includes(w.id));

          return (
            <div
              key={task.id}
              className="rounded-xl border border-surface-border bg-surface-raised p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-bold text-content-primary">{task.name}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gold mt-0.5">
                    {TASK_TYPE_LABEL[task.type] ?? task.type}
                  </p>
                </div>
              </div>

              {task.location && (
                <div className="flex items-center gap-1 text-xs text-content-muted mb-3">
                  <MapPin size={11} />
                  {task.location}
                </div>
              )}

              {assignedWorkers.length > 0 ? (
                <div>
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1.5">
                    <Users size={10} /> Assigned
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {assignedWorkers.map((w) => (
                      <span
                        key={w.id}
                        className="inline-flex items-center gap-1 text-xs bg-surface-overlay border border-surface-border rounded-full px-2.5 py-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                        {w.name}
                        <span className="text-content-muted capitalize">· {w.role}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-content-muted italic">No workers assigned yet.</p>
              )}

              {task.crewRequirements.length > 0 && (
                <div className="mt-2 pt-2 border-t border-surface-border flex flex-wrap gap-2">
                  {task.crewRequirements.map((req, i) => (
                    <span key={i} className="text-[10px] text-content-muted capitalize">
                      {req.count}× {req.role}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
