"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, CalendarDays, ChevronDown, Users, Truck } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CreateProjectModal } from "@/components/shell/CreateProjectModal";
import { useOrg } from "@/providers/OrgProvider";
import { getRoleGroup } from "@/lib/utils/roles";
import type { ProjectWorkerCounts } from "@/lib/supabase/workers";
import type { WorkerRole, Project, OrgWorker, Asset } from "@/types/domain";

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

type Expanded = "workers" | "equipment" | null;

function ProjectCard({
  project,
  pills,
  projectWorkers,
  projectAssets,
}: {
  project:        Project;
  pills:          { role: WorkerRole; label: string; count: number }[];
  projectWorkers: OrgWorker[];
  projectAssets:  Asset[];
}) {
  const [expanded, setExpanded] = useState<Expanded>(null);
  const router = useRouter();
  const { availableProjects, setCurrentProject } = useOrg();

  const workerCount = projectWorkers.length;
  const assetCount  = projectAssets.length;

  function goToSchedule() {
    const ctx = availableProjects.find((p) => p.id === project.id);
    if (ctx) setCurrentProject(ctx);
    router.push("/modules/cru/schedule");
  }

  function toggle(section: Exclude<Expanded, null>) {
    setExpanded((prev) => (prev === section ? null : section));
  }

  return (
    <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] p-4">
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

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => toggle("workers")}
          className={`flex items-center justify-between gap-2 px-3 py-2 rounded border text-xs font-semibold transition-colors ${
            expanded === "workers"
              ? "border-gold/40 bg-gold/5 text-gold"
              : "border-surface-border text-content-secondary hover:border-content-muted hover:text-content-primary"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Users size={13} /> Personnel
            <span className="tabular-nums text-content-muted font-normal">({workerCount})</span>
          </span>
          <ChevronDown size={13} className={`transition-transform ${expanded === "workers" ? "rotate-180" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => toggle("equipment")}
          className={`flex items-center justify-between gap-2 px-3 py-2 rounded border text-xs font-semibold transition-colors ${
            expanded === "equipment"
              ? "border-gold/40 bg-gold/5 text-gold"
              : "border-surface-border text-content-secondary hover:border-content-muted hover:text-content-primary"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <Truck size={13} /> Equipment
            <span className="tabular-nums text-content-muted font-normal">({assetCount})</span>
          </span>
          <ChevronDown size={13} className={`transition-transform ${expanded === "equipment" ? "rotate-180" : ""}`} />
        </button>
      </div>

      {expanded === "workers" && (
        <div className="mt-2 rounded border border-surface-border bg-surface-overlay/50 max-h-64 overflow-y-auto">
          {projectWorkers.length === 0 ? (
            <p className="text-xs text-content-muted py-3 text-center">No personnel on this site.</p>
          ) : (
            <ul className="divide-y divide-surface-border">
              {projectWorkers.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
                  <span className="truncate text-content-primary">{w.name}</span>
                  <span className="text-content-muted capitalize shrink-0">{ROLE_LABEL[w.role] ?? w.role}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {expanded === "equipment" && (
        <div className="mt-2 rounded border border-surface-border bg-surface-overlay/50 max-h-64 overflow-y-auto">
          {projectAssets.length === 0 ? (
            <p className="text-xs text-content-muted py-3 text-center">No equipment on this site.</p>
          ) : (
            <ul className="divide-y divide-surface-border">
              {projectAssets.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-content-primary">{a.name}</p>
                    <p className="truncate text-[11px] text-content-muted">{a.type}</p>
                  </div>
                  <StatusBadge status={a.status} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={goToSchedule}
          className="inline-flex items-center gap-1 text-xs text-content-muted hover:text-content-primary active:opacity-80 transition-colors"
        >
          <CalendarDays size={13} />
          View Schedule
        </button>
      </div>
    </div>
  );
}

export function ProjectsClient({
  workerCountsByProject,
}: {
  workerCountsByProject: Record<string, ProjectWorkerCounts>;
}) {
  const { projects, role, currentProject, workers, assets } = useOrg();
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {visibleProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            pills={rolePills(workerCountsByProject[project.id])}
            projectWorkers={workers.filter((w) => w.projectId === project.id)}
            projectAssets={assets.filter((a) => a.project_id === project.id)}
          />
        ))}

        {visibleProjects.length === 0 && (
          <p className="text-sm text-content-muted text-center py-12 col-span-full">No projects.</p>
        )}
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
