"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight, CalendarDays } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CreateProjectModal } from "@/components/shell/CreateProjectModal";
import { useOrg } from "@/providers/OrgProvider";
import { getRoleGroup } from "@/lib/utils/roles";
import type { ProjectWorkerCounts } from "@/lib/supabase/workers";
import type { WorkerRole } from "@/types/domain";

const ROLE_PILL_ORDER: WorkerRole[] = [
  "operator", "laborer", "mason", "carpenter", "driver", "mechanic",
];

const ROLE_LABEL: Partial<Record<WorkerRole, string>> = {
  operator:  "Operator",
  laborer:   "Laborer",
  mason:     "Mason",
  carpenter: "Carpenter",
  driver:    "Driver",
  mechanic:  "Mechanic",
};

function rolePills(counts: ProjectWorkerCounts | undefined): { role: WorkerRole; label: string; count: number }[] {
  if (!counts) return [];
  const out: { role: WorkerRole; label: string; count: number }[] = [];
  for (const role of ROLE_PILL_ORDER) {
    const count = counts[role] ?? 0;
    if (count > 0) {
      out.push({ role, label: ROLE_LABEL[role] ?? role, count });
    }
  }
  return out;
}

export function ProjectsClient({
  workerCountsByProject,
}: {
  workerCountsByProject: Record<string, ProjectWorkerCounts>;
}) {
  const { projects, role, currentProject } = useOrg();
  const [showModal, setShowModal] = useState(false);

  const roleGroup       = getRoleGroup(role);
  const visibleProjects = (roleGroup === "field" || roleGroup === "maintenance")
    ? projects.filter((p) => p.id === currentProject.id)
    : projects;

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Projects"
        subtitle={
          roleGroup === "field" || roleGroup === "maintenance"
            ? "Your assigned project"
            : `${projects.length} projects across your organization`
        }
        action={
          roleGroup !== "field" && roleGroup !== "maintenance" && role !== "viewer" ? (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 min-h-11 md:min-h-0 px-4 py-2 md:py-1.5 text-sm md:text-xs font-semibold bg-gold text-black rounded hover:bg-gold-hover active:opacity-80 transition-colors"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </button>
          ) : undefined
        }
      />

      {/* Mobile: stacked card list */}
      <div className="md:hidden space-y-2">
        {visibleProjects.map((project) => {
          const pills = rolePills(workerCountsByProject[project.id]);
          return (
            <div
              key={project.id}
              className="block bg-surface-raised border border-surface-border rounded-[var(--radius-card)] p-4"
            >
              <Link
                href={`/projects/${project.id}`}
                className="block active:opacity-80 active:scale-[0.995] transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-content-primary truncate">{project.name}</p>
                    <p className="text-xs text-content-muted mt-0.5 truncate">{project.location}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <StatusBadge status={project.status} />
                    <ChevronRight size={16} className="text-content-muted" />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs text-content-secondary mb-3">
                  <span className="truncate">{project.phase}</span>
                  <span className="truncate text-content-muted">{project.pm_name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full" style={{ width: `${project.progress_pct}%` }} />
                  </div>
                  <span className="text-xs text-content-muted tabular-nums shrink-0 w-9 text-right">
                    {project.progress_pct}%
                  </span>
                </div>
              </Link>

              {pills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {pills.map((pill) => (
                    <span
                      key={pill.role}
                      className="inline-flex items-center gap-1 rounded-full bg-surface-overlay px-2 py-0.5 text-[11px] text-content-muted"
                    >
                      <span>{pill.label}</span>
                      <span className="tabular-nums text-content-secondary">×{pill.count}</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <Link
                  href="/modules/cru"
                  className="inline-flex items-center gap-1 text-xs text-content-muted hover:text-content-primary active:opacity-80 transition-colors"
                >
                  <CalendarDays size={13} />
                  View Schedules
                </Link>
              </div>
            </div>
          );
        })}

        {visibleProjects.length === 0 && (
          <p className="text-sm text-content-muted text-center py-12">No projects.</p>
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-[var(--radius-card)] border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-overlay">
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Project</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Phase</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted hidden lg:table-cell">PM</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Progress</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Status</th>
              <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Schedules</th>
            </tr>
          </thead>
          <tbody>
            {visibleProjects.map((project) => {
              const pills = rolePills(workerCountsByProject[project.id]);
              return (
                <tr key={project.id} className="border-b border-surface-border last:border-0 hover:bg-surface-overlay transition-colors">
                  <td className="px-4 py-3.5 align-top">
                    <Link href={`/projects/${project.id}`} className="group block">
                      <p className="font-semibold text-content-primary group-hover:text-gold transition-colors">{project.name}</p>
                      <p className="text-xs text-content-muted mt-0.5">{project.location}</p>
                    </Link>
                    {pills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {pills.map((pill) => (
                          <span
                            key={pill.role}
                            className="inline-flex items-center gap-1 rounded-full bg-surface-overlay px-2 py-0.5 text-[11px] text-content-muted"
                          >
                            <span>{pill.label}</span>
                            <span className="tabular-nums text-content-secondary">×{pill.count}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-content-secondary align-top">{project.phase}</td>
                  <td className="px-4 py-3.5 text-content-secondary hidden lg:table-cell align-top">{project.pm_name}</td>
                  <td className="px-4 py-3.5 align-top">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                        <div className="h-full bg-gold rounded-full" style={{ width: `${project.progress_pct}%` }} />
                      </div>
                      <span className="text-xs text-content-muted tabular-nums">{project.progress_pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right align-top">
                    <Link
                      href="/modules/cru"
                      className="inline-flex items-center gap-1 text-xs text-content-muted hover:text-content-primary transition-colors"
                    >
                      <CalendarDays size={13} />
                      View Schedules
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreated={(_projectId) => setShowModal(false)}
        />
      )}
    </PageContainer>
  );
}
