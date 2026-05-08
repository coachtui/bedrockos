"use client";

import { useState, useEffect } from "react";
import { InspectorPanel } from "@/components/ui/InspectorPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useOrg } from "@/providers/OrgProvider";
import type { UserRole } from "@/types/org";
import type { CrewStatus } from "@/types/domain";

const CAN_EDIT = new Set<UserRole>(["owner", "admin", "equipment_director", "operations_manager", "superintendent"]);

const CREW_STATUSES: { value: CrewStatus; label: string }[] = [
  { value: "on_site",  label: "On Site" },
  { value: "off_site", label: "Off Site" },
];

interface CrewInspectorPanelProps {
  crewId:  string | null;
  onClose: () => void;
}

export function CrewInspectorPanel({ crewId, onClose }: CrewInspectorPanelProps) {
  const {
    crews, workers, role,
    updateCrewStatus, updateCrewName,
    addWorkerToCrew, removeWorkerFromCrew,
  } = useOrg();

  const crew    = crewId ? (crews.find((c) => c.id === crewId) ?? null) : null;
  const canEdit = CAN_EDIT.has(role);

  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState("");

  // Reset edit state when selected crew changes
  useEffect(() => {
    setEditingName(false);
    setNameInput(crew?.name ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewId]);

  const memberWorkers    = workers.filter((w) => crew?.memberIds.includes(w.id));
  const availableWorkers = workers.filter(
    (w) => !crew?.memberIds.includes(w.id) && w.projectId === crew?.projectId,
  );

  function handleNameSave() {
    if (!crew || !nameInput.trim()) return;
    updateCrewName(crew.id, nameInput.trim());
    setEditingName(false);
  }

  return (
    <InspectorPanel
      open={!!crew}
      onClose={onClose}
      title={crew?.name ?? ""}
      subtitle="Crew"
    >
      {crew && (
        <div className="px-5 py-4 space-y-5">

          {/* ── Name ───────────────────────────────────────────────── */}
          {canEdit && (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
                Name
              </h3>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")  handleNameSave();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    className="flex-1 text-xs bg-surface-overlay border border-surface-border rounded-lg px-2.5 py-1.5 text-content-primary focus:outline-none focus:border-teal"
                  />
                  <button
                    onClick={handleNameSave}
                    className="px-3 py-1 text-[10px] font-semibold bg-teal text-white rounded hover:opacity-90 transition-opacity"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="text-[10px] text-content-muted hover:text-content-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-content-primary">{crew.name}</p>
                  <button
                    onClick={() => { setNameInput(crew.name); setEditingName(true); }}
                    className="text-[10px] font-semibold text-content-muted hover:text-teal transition-colors"
                  >
                    Edit
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ── Status ─────────────────────────────────────────────── */}
          <section className={canEdit ? "border-t border-surface-border pt-4" : ""}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Status
            </h3>
            {canEdit ? (
              <div className="flex gap-1">
                {CREW_STATUSES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => updateCrewStatus(crew.id, value)}
                    className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded border transition-colors ${
                      crew.status === value
                        ? "bg-teal text-white border-teal"
                        : "bg-surface-overlay text-content-secondary border-surface-border hover:border-teal/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <StatusBadge status={crew.status ?? "off_site"} />
            )}
          </section>

          {/* ── Lead ─────────────────────────────────────────────────── */}
          {crew.leadName && (
            <section className="border-t border-surface-border pt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
                Lead
              </h3>
              <p className="text-xs font-semibold text-content-primary">{crew.leadName}</p>
            </section>
          )}

          {/* ── Members ──────────────────────────────────────────────── */}
          <section className="border-t border-surface-border pt-4 pb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Members ({memberWorkers.length})
            </h3>

            {memberWorkers.length === 0 ? (
              <p className="text-xs text-content-muted italic mb-4">No members assigned</p>
            ) : (
              <ul className="space-y-0.5 mb-4">
                {memberWorkers.map((w) => (
                  <li key={w.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-surface-overlay">
                    <div>
                      <p className="text-xs font-semibold text-content-primary">{w.name}</p>
                      <p className="text-[10px] text-content-muted capitalize">{w.role}</p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => removeWorkerFromCrew(crew.id, w.id)}
                        className="text-[10px] text-content-muted hover:text-status-critical transition-colors font-semibold px-1"
                        aria-label={`Remove ${w.name}`}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canEdit && availableWorkers.length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-2">
                  Available to Add
                </p>
                <ul className="space-y-0.5">
                  {availableWorkers.map((w) => (
                    <li key={w.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-surface-overlay">
                      <div>
                        <p className="text-xs font-semibold text-content-primary">{w.name}</p>
                        <p className="text-[10px] text-content-muted capitalize">{w.role}</p>
                      </div>
                      <button
                        onClick={() => addWorkerToCrew(crew.id, w.id)}
                        className="text-[10px] text-content-muted hover:text-teal transition-colors font-semibold px-1"
                        aria-label={`Add ${w.name}`}
                      >
                        +
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

        </div>
      )}
    </InspectorPanel>
  );
}
