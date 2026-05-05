"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { GCA_HOLIDAYS_2026 } from "@/lib/cx/holidays";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";

export function ProjectSettingsClient({ projectId }: { projectId: string }) {
  const { projects, setCurrentProject, updateProject, role } = useOrg();
  const project = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (project) {
      setCurrentProject({ id: project.id, name: project.name, slug: project.slug });
    }
  }, [project?.id, setCurrentProject]);

  if (!project) return null;

  const canEdit = role === "owner" || role === "admin" || role === "pm";
  const workingDates = project.working_holiday_dates ?? [];

  function toggleHoliday(date: string) {
    if (!canEdit) return;
    const next = workingDates.includes(date)
      ? workingDates.filter((d) => d !== date)
      : [...workingDates, date];
    updateProject(projectId, { working_holiday_dates: next });
  }

  return (
    <PageContainer>
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}`}
          className="flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors"
        >
          <ArrowLeft size={12} /> Back to {project.name}
        </Link>
      </div>
      <SectionHeader title="Project Settings" subtitle={project.name} />
      <Card className="mt-4">
        <h2 className="text-sm font-semibold text-content-primary mb-1">
          2026 GCA Holiday Schedule
        </h2>
        <p className="text-xs text-content-muted mb-4">
          All GCA holidays are non-working days by default. Toggle any holiday your crew will work — it will appear as a normal working day on the Gantt.
        </p>
        <div className="divide-y divide-surface-border">
          {GCA_HOLIDAYS_2026.map((h) => {
            const working = workingDates.includes(h.date);
            const label = new Date(h.date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month:   "long",
              day:     "numeric",
            });
            return (
              <div key={h.date} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-content-primary">{h.name}</p>
                  <p className="text-xs text-content-muted">{label}</p>
                </div>
                <button
                  onClick={() => toggleHoliday(h.date)}
                  disabled={!canEdit}
                  className={[
                    "px-3 py-1 rounded text-xs font-medium transition-colors border",
                    working
                      ? "bg-gold/20 text-gold border-gold/40"
                      : "bg-surface-raised text-content-muted border-surface-border",
                    !canEdit ? "opacity-50 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  {working ? "Working" : "Holiday"}
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    </PageContainer>
  );
}
