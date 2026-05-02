"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CreateProjectModal } from "@/components/shell/CreateProjectModal";
import { useOrg } from "@/providers/OrgProvider";
import { getRoleGroup } from "@/lib/utils/roles";

export function ProjectsClient() {
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
          roleGroup !== "field" && roleGroup !== "maintenance" ? (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
            >
              <Plus size={13} />
              New Project
            </button>
          ) : undefined
        }
      />

      <div className="rounded-[var(--radius-card)] border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-overlay">
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Project</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted hidden md:table-cell">Phase</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted hidden lg:table-cell">PM</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Progress</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleProjects.map((project) => (
              <tr key={project.id} className="border-b border-surface-border last:border-0 hover:bg-surface-overlay transition-colors">
                <td className="px-4 py-3.5">
                  <Link href={`/projects/${project.id}`} className="group block">
                    <p className="font-semibold text-content-primary group-hover:text-gold transition-colors">{project.name}</p>
                    <p className="text-xs text-content-muted mt-0.5">{project.location}</p>
                  </Link>
                </td>
                <td className="px-4 py-3.5 text-content-secondary hidden md:table-cell">{project.phase}</td>
                <td className="px-4 py-3.5 text-content-secondary hidden lg:table-cell">{project.pm_name}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${project.progress_pct}%` }} />
                    </div>
                    <span className="text-xs text-content-muted tabular-nums">{project.progress_pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={project.status} />
                </td>
              </tr>
            ))}
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
