"use client";

import { useState } from "react";
import { Plus, User } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { AddWorkerModal } from "@/components/shell/AddWorkerModal";
import { WorkerInspectorPanel } from "@/components/shell/WorkerInspectorPanel";
import { useOrg } from "@/providers/OrgProvider";

export function WorkersClient() {
  const { workers, role, currentProject } = useOrg();
  const [showModal,        setShowModal]        = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  // Superintendents see only workers on their current project
  const filteredWorkers =
    role === "superintendent"
      ? workers.filter((w) => w.projectId === currentProject.id)
      : workers;

  const availableCount = filteredWorkers.filter((w) => w.available).length;

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Workers"
        subtitle={`${filteredWorkers.length} workers · ${availableCount} available`}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
          >
            <Plus size={13} />
            Add Worker
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div className="w-9 h-9 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center">
                  <User size={16} className="text-content-secondary" />
                </div>
                <span
                  className={`w-2 h-2 rounded-full mt-1 ${worker.available ? "bg-green-400" : "bg-content-muted"}`}
                  title={worker.available ? "Available" : "Unavailable"}
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
