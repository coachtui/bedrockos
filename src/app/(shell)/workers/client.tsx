"use client";

import { useState, useMemo } from "react";
import {
  Plus, ChevronDown,
  Wrench, Truck, Hammer, HardHat, ClipboardList, BrickWall, Shovel,
  type LucideIcon,
} from "lucide-react";
import { Bulldozer } from "@phosphor-icons/react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { AddWorkerModal } from "@/components/shell/AddWorkerModal";
import { WorkerInspectorPanel } from "@/components/shell/WorkerInspectorPanel";
import { useOrg } from "@/providers/OrgProvider";
import type { OrgWorker, WorkerRole } from "@/types/domain";

type AnyIcon = LucideIcon | typeof Bulldozer;

const ROLE_ICON: Record<WorkerRole, AnyIcon> = {
  mechanic:       Wrench,
  driver:         Truck,
  carpenter:      Hammer,
  mason:          BrickWall,
  operator:       Bulldozer,
  foreman:        HardHat,
  superintendent: ClipboardList,
  laborer:        Shovel,
};

function WorkerCard({
  worker,
  isSelected,
  onClick,
}: {
  worker:     OrgWorker;
  isSelected: boolean;
  onClick:    () => void;
}) {
  const [skillsOpen, setSkillsOpen] = useState(false);
  const RoleIcon = ROLE_ICON[worker.role] ?? HardHat;

  return (
    <div
      className={`bg-surface-raised border rounded-[var(--radius-card)] p-4 cursor-pointer active:opacity-80 transition-colors ${
        isSelected ? "border-teal/50" : "border-surface-border hover:border-surface-border-hover"
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center">
          <RoleIcon size={16} className="text-content-secondary" />
        </div>
        <span
          className={`w-2 h-2 rounded-full mt-1 ${worker.available ? "bg-green-400" : "bg-content-muted"}`}
          title={worker.available ? "Available" : "Needed on Site"}
        />
      </div>

      <p className="font-semibold text-content-primary text-sm">{worker.name}</p>
      <p className="text-xs text-content-muted mt-0.5 capitalize">{worker.role}</p>

      <div className="mt-3">
        {worker.skills.length === 0 ? (
          <p className="text-xs text-content-muted">No skills on file</p>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSkillsOpen((o) => !o); }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded border text-xs font-semibold transition-colors ${
                skillsOpen
                  ? "border-gold/40 bg-gold/5 text-gold"
                  : "border-surface-border text-content-secondary hover:border-content-muted hover:text-content-primary"
              }`}
            >
              <span>Skills ({worker.skills.length})</span>
              <ChevronDown size={13} className={`transition-transform ${skillsOpen ? "rotate-180" : ""}`} />
            </button>
            {skillsOpen && (
              <div className="mt-2 rounded border border-surface-border bg-surface-overlay/50">
                <ul className="divide-y divide-surface-border">
                  {worker.skills.map((skill) => (
                    <li key={skill} className="px-3 py-1.5 text-xs text-content-primary">{skill}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
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
        title="Personnel"
        subtitle={`${filteredWorkers.length}${roleFilter !== "all" ? ` ${roleFilter}s` : " personnel"} · ${availableCount} available`}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 min-h-11 md:min-h-0 px-4 md:px-3 py-2 md:py-1.5 text-sm md:text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 active:opacity-80 transition-colors"
          >
            <Plus size={13} />
            Add Personnel
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
        {filteredWorkers.map((worker) => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            isSelected={worker.id === selectedWorkerId}
            onClick={() => setSelectedWorkerId(worker.id)}
          />
        ))}
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
