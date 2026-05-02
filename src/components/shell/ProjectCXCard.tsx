"use client";

import Link from "next/link";
import { Users, CalendarDays, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { localDateString } from "@/lib/utils/time";

interface ProjectCXCardProps {
  projectId: string;
}

export function ProjectCXCard({ projectId }: ProjectCXCardProps) {
  const { workers } = useOrg();
  const { tasks, events } = useCx();
  const { isModuleEnabled } = useModuleAccess();

  const today = localDateString();

  const assignedCount = workers.filter((w) => w.projectId === projectId).length;

  const activeTasks = tasks.filter(
    (t) => t.projectId === projectId && t.startDate <= today && t.endDate >= today,
  );

  const nextEvent = events
    .filter((e) => e.projectId === projectId && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const cruEnabled = isModuleEnabled("cru");

  return (
    <Card variant="default" className="!p-0">
      <div className="p-5 pb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted">CX — Crew Operations</p>
        {cruEnabled ? (
          <Link
            href={`/modules/cru?projectId=${projectId}&source=project-cx-card`}
            className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1"
          >
            Open <ChevronRight size={11} />
          </Link>
        ) : (
          <span className="text-xs text-content-muted opacity-40">Locked</span>
        )}
      </div>

      <div className="px-5 pb-5 space-y-3">
        <div className="flex items-center gap-3">
          <Users size={13} className="text-gold shrink-0" />
          <span className="text-sm text-content-primary">
            <span className="font-semibold">{assignedCount}</span>{" "}
            <span className="text-content-muted">
              worker{assignedCount !== 1 ? "s" : ""} assigned
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <CalendarDays size={13} className="text-gold shrink-0" />
          <span className="text-sm text-content-primary">
            <span className="font-semibold">{activeTasks.length}</span>{" "}
            <span className="text-content-muted">
              task{activeTasks.length !== 1 ? "s" : ""} active today
            </span>
          </span>
        </div>

        {nextEvent && (
          <div className="mt-3 pt-3 border-t border-surface-border">
            <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted mb-1.5">
              Next Event
            </p>
            <p className="text-sm font-medium text-content-primary">{nextEvent.name}</p>
            <p className="text-xs text-content-muted mt-0.5">
              {new Date(nextEvent.date + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day:   "numeric",
              })}
              {nextEvent.location && ` · ${nextEvent.location}`}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
