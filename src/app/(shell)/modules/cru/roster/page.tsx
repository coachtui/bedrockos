"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RosterWorkerCard } from "@/components/cx/RosterWorkerCard";
import { TodayView } from "@/components/cx/TodayView";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import { ArrowLeft } from "lucide-react";
import type { WorkerRole } from "@/types/domain";

const ROLES: Array<{ value: WorkerRole | "all"; label: string }> = [
  { value: "all",            label: "All" },
  { value: "mason",          label: "Mason" },
  { value: "laborer",        label: "Laborer" },
  { value: "operator",       label: "Operator" },
  { value: "carpenter",      label: "Carpenter" },
  { value: "foreman",        label: "Foreman" },
  { value: "superintendent", label: "Superintendent" },
  { value: "mechanic",       label: "Mechanic" },
  { value: "driver",         label: "Driver" },
];

export default function RosterPage() {
  const { workers, projects, currentProject, role } = useOrg();
  const { assignments } = useCx();
  const [roleFilter, setRoleFilter] = useState<WorkerRole | "all">("all");

  if (role === "foreman") return <TodayView />;

  const primaryWorkers = workers.filter((w) => w.projectId === currentProject.id);

  const today = new Date().toISOString().split("T")[0];
  const borrowedWorkerIds = new Set(
    assignments
      .filter((a) => a.projectId === currentProject.id && a.date === today)
      .map((a) => a.workerId),
  );
  const borrowedWorkers = workers.filter(
    (w) => borrowedWorkerIds.has(w.id) && w.projectId !== currentProject.id,
  );

  const allOnSite = [...primaryWorkers, ...borrowedWorkers];

  const filtered = roleFilter === "all"
    ? allOnSite
    : allOnSite.filter((w) => w.role === roleFilter);

  const grouped = useMemo(() => {
    const map: Partial<Record<WorkerRole, typeof filtered>> = {};
    for (const w of filtered) {
      if (!map[w.role]) map[w.role] = [];
      map[w.role]!.push(w);
    }
    return map;
  }, [filtered]);

  return (
    <PageContainer>
      <div className="mb-4">
        <Link href="/modules/cru" className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors">
          <ArrowLeft size={12} /> CX
        </Link>
      </div>

      <SectionHeader
        title="Roster"
        subtitle={`${allOnSite.length} workers on site today`}
      />

      <div className="flex gap-1.5 flex-wrap mb-5 mt-4">
        {ROLES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRoleFilter(r.value as WorkerRole | "all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              roleFilter === r.value
                ? "bg-gold border-gold text-black"
                : "border-surface-border text-content-muted hover:border-gold/40 hover:text-content-primary"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {Object.entries(grouped).map(([groupRole, roleWorkers]) => (
        <div key={groupRole} className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-2 capitalize">
            {groupRole} · {roleWorkers?.length}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {roleWorkers?.map((w) => {
              const borrowed = w.projectId !== currentProject.id;
              const sourceProject = borrowed
                ? projects.find((p) => p.id === w.projectId)
                : undefined;
              return (
                <RosterWorkerCard
                  key={w.id}
                  worker={w}
                  borrowed={borrowed}
                  sourceName={sourceProject?.name}
                />
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-sm text-content-muted py-8 text-center">No workers match this filter.</p>
      )}
    </PageContainer>
  );
}
