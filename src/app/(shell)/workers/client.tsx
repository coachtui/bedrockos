"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { AddWorkerModal } from "@/components/shell/AddWorkerModal";
import { WorkerInspectorPanel } from "@/components/shell/WorkerInspectorPanel";
import { useOrg } from "@/providers/OrgProvider";

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-rose-500", "bg-amber-500",
  "bg-teal-500", "bg-emerald-500", "bg-indigo-500", "bg-pink-500",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string): string {
  const index = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function WorkersClient() {
  const { workers, role, currentProject } = useOrg();
  const [showModal,        setShowModal]        = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [roleFilter,       setRoleFilter]       = useState<string>("all");

  // Superintendents see only workers on their current project
  const scopedWorkers =
    role === "superintendent"
      ? workers.filter((w) => w.projectId === currentProject.id)
      : workers;

  const uniqueRoles = useMemo(
    () => [...new Set(scopedWorkers.map((w) => w.role))].sort(),
    [scopedWorkers],
  );

  const filteredWorkers =
    roleFilter === "all"
      ? scopedWorkers
      : scopedWorkers.filter((w) => w.role === roleFilter);

  const availableCount = filteredWorkers.filter((w) => w.available).length;

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Workers"
        subtitle={`${filteredWorkers.length}${roleFilter !== "all" ? ` ${roleFilter}s` : " workers"} · ${availableCount} available`}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 min-h-11 md:min-h-0 px-4 md:px-3 py-2 md:py-1.5 text-sm md:text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 active:opacity-80 transition-colors"
          >
            <Plus size={13} />
            Add Worker
          </button>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-sm bg-surface-overlay border border-surface-border rounded px-3 py-1.5 text-content-primary focus:outline-none focus:border-teal/50"
        >
          <option value="all">All Roles</option>
          {uniqueRoles.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filteredWorkers.map((worker) => {
          const visibleSkills = worker.skills.slice(0, 3);
          const extraCount    = worker.skills.length - visibleSkills.length;
          const isSelected    = worker.id === selectedWorkerId;

          return (
            <Card
              key={worker.id}
              variant="default"
              onClick={() => setSelectedWorkerId(worker.id)}
              className={`hover:border-surface-border-hover transition-colors ${isSelected ? "border-teal/50" : ""}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(worker.name)}`}>
                  {getInitials(worker.name)}
                </div>
                <span
                  className={`w-2 h-2 rounded-full mt-1 ${worker.available ? "bg-green-400" : "bg-content-muted"}`}
                  title={worker.available ? "Available" : "Needed on Site"}
                />
              </div>
              <p className="font-semibold text-content-primary text-sm">{worker.name}</p>
              <p className="text-xs text-content-muted mt-0.5 capitalize">{worker.role}</p>
              <div className="mt-3 pt-3 border-t border-surface-border">
                {worker.skills.length === 0 ? (
                  <p className="text-xs text-content-muted">No skills on file</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {visibleSkills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs bg-surface-overlay border border-surface-border rounded px-2 py-0.5 text-content-secondary"
                      >
                        {skill}
                      </span>
                    ))}
                    {extraCount > 0 && (
                      <span className="text-xs bg-surface-overlay border border-surface-border rounded px-2 py-0.5 text-content-muted">
                        +{extraCount} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {showModal && (
        <AddWorkerModal
          onClose={() => setShowModal(false)}
          onCreated={(_workerId) => setShowModal(false)}
        />
      )}

      <WorkerInspectorPanel
        workerId={selectedWorkerId}
        onClose={() => setSelectedWorkerId(null)}
      />
    </PageContainer>
  );
}
