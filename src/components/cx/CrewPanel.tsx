"use client";

import { useState, useEffect } from "react";
import { Plus, UserMinus } from "lucide-react";
import { InspectorPanel } from "@/components/ui/InspectorPanel";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import type { OrgCrew } from "@/types/domain";

interface CrewPanelProps {
  open:    boolean;
  onClose: () => void;
  crew?:   OrgCrew;
}

export function CrewPanel({ open, onClose, crew }: CrewPanelProps) {
  const {
    workers, currentProject, role,
    addCrew, addWorkerToCrew, removeWorkerFromCrew,
  } = useOrg();
  const { assignments } = useCx();

  const [name, setName] = useState(crew?.name ?? "");

  useEffect(() => {
    setName(crew?.name ?? "");
  }, [crew?.id]);

  const isCreate = !crew;
  const canEdit  = role !== "foreman";

  const today = new Date().toISOString().split("T")[0];
  const borrowedIds = new Set(
    assignments
      .filter((a) => a.projectId === currentProject.id && a.date === today)
      .map((a) => a.workerId),
  );
  const projectWorkers = workers.filter(
    (w) => w.projectId === currentProject.id || borrowedIds.has(w.id),
  );

  const memberSet = new Set(crew?.memberIds ?? []);

  function handleCreate() {
    if (!name.trim()) return;
    addCrew({ name: name.trim(), projectId: currentProject.id, memberIds: [] });
    onClose();
  }

  function toggleMember(workerId: string) {
    if (!crew) return;
    if (memberSet.has(workerId)) {
      removeWorkerFromCrew(crew.id, workerId);
    } else {
      addWorkerToCrew(crew.id, workerId);
    }
  }

  return (
    <InspectorPanel
      open={open}
      onClose={onClose}
      title={isCreate ? "New Crew" : crew.name}
      subtitle={isCreate ? undefined : `${crew.memberIds.length} member${crew.memberIds.length !== 1 ? "s" : ""}`}
    >
      {isCreate && (
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-content-secondary uppercase tracking-wide mb-1.5">
              Crew Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mason Crew A"
              className="w-full bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-content-primary focus:outline-none focus:border-gold/50"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full px-4 py-2 bg-gold hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-colors"
          >
            Create Crew
          </button>
        </div>
      )}

      {!isCreate && crew && (
        <div className="p-4 space-y-5">
          <div>
            <p className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-2">
              Members · {crew.memberIds.length}
            </p>
            {crew.memberIds.length === 0 && (
              <p className="text-xs text-content-muted py-2">No members yet.</p>
            )}
            {crew.memberIds.map((id) => {
              const w = workers.find((x) => x.id === id);
              if (!w) return null;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between py-2 border-b border-surface-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-content-primary">{w.name}</p>
                    <p className="text-xs text-content-muted capitalize">{w.role}</p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => toggleMember(id)}
                      className="p-1 text-content-muted hover:text-status-critical transition-colors"
                      title="Remove from crew"
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {canEdit && (
            <div>
              <p className="text-xs font-semibold text-content-secondary uppercase tracking-wide mb-2">
                Add from Roster
              </p>
              {projectWorkers.filter((w) => !memberSet.has(w.id)).length === 0 ? (
                <p className="text-xs text-content-muted py-2">All roster workers are in this crew.</p>
              ) : (
                projectWorkers
                  .filter((w) => !memberSet.has(w.id))
                  .map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between py-2 border-b border-surface-border last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-content-primary">{w.name}</p>
                        <p className="text-xs text-content-muted capitalize">{w.role}</p>
                      </div>
                      <button
                        onClick={() => toggleMember(w.id)}
                        className="p-1 text-content-muted hover:text-gold transition-colors"
                        title="Add to crew"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      )}
    </InspectorPanel>
  );
}
