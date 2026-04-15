"use client";

import { useState, useEffect } from "react";
import { InspectorPanel } from "@/components/ui/InspectorPanel";
import { useOrg } from "@/providers/OrgProvider";
import type { UserRole } from "@/types/org";

const CAN_EDIT           = new Set<UserRole>(["owner", "admin", "superintendent"]);
const CAN_CHANGE_PROJECT = new Set<UserRole>(["owner", "admin"]);

interface WorkerInspectorPanelProps {
  workerId: string | null;
  onClose:  () => void;
}

export function WorkerInspectorPanel({ workerId, onClose }: WorkerInspectorPanelProps) {
  const {
    workers, crews, projects, skillCatalog,
    currentProject, role,
    updateWorkerSkills, reassignWorker, addSkillToRole,
  } = useOrg();

  const worker = workerId ? (workers.find((w) => w.id === workerId) ?? null) : null;

  // Reassign form state
  const [showReassign,      setShowReassign]      = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [selectedCrewId,    setSelectedCrewId]    = useState<string | undefined>();

  // Skills edit state
  const [editSkills,       setEditSkills]       = useState(false);
  const [showSkillPicker,  setShowSkillPicker]  = useState(false);
  const [pickerSelected,   setPickerSelected]   = useState<Set<string>>(new Set());
  const [customSkillInput, setCustomSkillInput] = useState("");

  // Reset all panel state whenever the selected worker changes
  useEffect(() => {
    setShowReassign(false);
    setEditSkills(false);
    setShowSkillPicker(false);
    setPickerSelected(new Set());
    setCustomSkillInput("");
    setSelectedProjectId(worker?.projectId);
    setSelectedCrewId(undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);

  const canEdit          = CAN_EDIT.has(role);
  const canChangeProject = CAN_CHANGE_PROJECT.has(role);

  // Derived: current project + crew for read-only display
  const workerProject = worker?.projectId
    ? projects.find((p) => p.id === worker.projectId)
    : undefined;
  const currentCrew = worker
    ? crews.find((c) => c.memberIds.includes(worker.id))
    : undefined;

  // Crews available in the reassign form — scoped to the selected (or current) project
  const reassignProjectId = canChangeProject ? selectedProjectId : currentProject.id;
  const projectCrews = crews.filter((c) => c.projectId === reassignProjectId);

  // Skills not already on the worker (for picker)
  const availableSkills = worker
    ? (skillCatalog[worker.role] ?? []).filter((s) => !worker.skills.includes(s))
    : [];

  function handleRemoveSkill(skill: string) {
    if (!worker) return;
    updateWorkerSkills(worker.id, worker.skills.filter((s) => s !== skill));
  }

  function handlePickerToggle(skill: string, checked: boolean) {
    setPickerSelected((prev) => {
      const next = new Set(prev);
      if (checked) { next.add(skill); } else { next.delete(skill); }
      return next;
    });
  }

  function handlePickerDone() {
    if (!worker) return;
    if (pickerSelected.size > 0) {
      updateWorkerSkills(worker.id, [...worker.skills, ...Array.from(pickerSelected)]);
    }
    setPickerSelected(new Set());
    setShowSkillPicker(false);
  }

  function handleAddCustomSkill() {
    const trimmed = customSkillInput.trim();
    if (!trimmed || !worker) return;
    addSkillToRole(worker.role, trimmed);
    setPickerSelected((prev) => new Set([...prev, trimmed]));
    setCustomSkillInput("");
  }

  function handleConfirmReassign() {
    if (!worker) return;
    reassignWorker(worker.id, reassignProjectId, selectedCrewId);
    setShowReassign(false);
  }

  const subtitle = worker
    ? `Worker · ${worker.role.charAt(0).toUpperCase() + worker.role.slice(1)}`
    : undefined;

  return (
    <InspectorPanel
      open={!!worker}
      onClose={onClose}
      title={worker?.name ?? ""}
      subtitle={subtitle}
    >
      {worker && (
        <div className="px-5 py-4 space-y-5">

          {/* ── Assignment ─────────────────────────────────────────────── */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Assignment
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-content-muted">Project</span>
                <span className="font-semibold text-content-primary">
                  {workerProject?.name ?? "Unassigned"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-content-muted">Crew</span>
                <span className="font-semibold text-content-primary">
                  {currentCrew?.name ?? "No crew assigned"}
                </span>
              </div>
            </div>

            {canEdit && !showReassign && (
              <button
                onClick={() => setShowReassign(true)}
                className="mt-3 text-[10px] font-semibold text-content-muted hover:text-teal transition-colors"
              >
                Reassign
              </button>
            )}

            {showReassign && (
              <div className="mt-3 border border-surface-border rounded-lg p-3 space-y-3">
                {/* Project: dropdown for admin/owner, read-only text for superintendent */}
                {canChangeProject ? (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1.5">
                      Project
                    </label>
                    <select
                      value={selectedProjectId ?? ""}
                      onChange={(e) => {
                        setSelectedProjectId(e.target.value || undefined);
                        setSelectedCrewId(undefined);
                      }}
                      className="w-full text-xs bg-surface-overlay border border-surface-border rounded-lg px-2.5 py-1.5 text-content-primary focus:outline-none focus:border-teal"
                    >
                      <option value="">Unassigned</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1">
                      Project
                    </p>
                    <p className="text-xs text-content-primary">{currentProject.name}</p>
                  </div>
                )}

                {/* Crew dropdown */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1.5">
                    Crew
                  </label>
                  <select
                    value={selectedCrewId ?? ""}
                    onChange={(e) => setSelectedCrewId(e.target.value || undefined)}
                    className="w-full text-xs bg-surface-overlay border border-surface-border rounded-lg px-2.5 py-1.5 text-content-primary focus:outline-none focus:border-teal"
                  >
                    <option value="">No crew</option>
                    {projectCrews.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleConfirmReassign}
                    className="px-3 py-1 text-[10px] font-semibold bg-teal text-white rounded hover:opacity-90 transition-opacity"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowReassign(false)}
                    className="text-[10px] text-content-muted hover:text-content-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── Skills ─────────────────────────────────────────────────── */}
          <section className="border-t border-surface-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted">
                Skills
              </h3>
              {canEdit && !editSkills && (
                <button
                  onClick={() => setEditSkills(true)}
                  className="text-[10px] font-semibold text-content-muted hover:text-teal transition-colors"
                >
                  Edit skills
                </button>
              )}
              {editSkills && (
                <button
                  onClick={() => { setEditSkills(false); setShowSkillPicker(false); setPickerSelected(new Set()); }}
                  className="text-[10px] font-semibold text-teal hover:opacity-80 transition-opacity"
                >
                  Done editing
                </button>
              )}
            </div>

            {/* Skills tags */}
            {worker.skills.length === 0 && !editSkills && (
              <p className="text-xs text-content-muted italic">No skills on file</p>
            )}
            {(worker.skills.length > 0 || editSkills) && (
              <div className="flex flex-wrap gap-1.5">
                {worker.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 text-xs bg-surface-overlay border border-surface-border rounded px-2 py-0.5 text-content-secondary"
                  >
                    {skill}
                    {editSkills && (
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-content-muted hover:text-status-critical transition-colors leading-none ml-0.5"
                        aria-label={`Remove ${skill}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {editSkills && !showSkillPicker && (
                  <button
                    onClick={() => setShowSkillPicker(true)}
                    className="text-xs bg-surface-overlay border border-dashed border-surface-border-hover rounded px-2 py-0.5 text-content-muted hover:text-teal hover:border-teal/40 transition-colors"
                  >
                    + Add skill
                  </button>
                )}
              </div>
            )}

            {/* Inline skill picker */}
            {showSkillPicker && (
              <div className="mt-3 border border-teal/20 bg-teal/5 rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-teal/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-teal">Add Skills</p>
                </div>
                <div className="p-2 max-h-48 overflow-y-auto space-y-0.5">
                  {availableSkills.length === 0 ? (
                    <p className="text-xs text-content-muted italic py-2 text-center">All catalog skills already added.</p>
                  ) : (
                    availableSkills.map((skill) => (
                      <label
                        key={skill}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-overlay cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={pickerSelected.has(skill)}
                          onChange={(e) => handlePickerToggle(skill, e.target.checked)}
                          className="accent-teal"
                        />
                        <span className="text-xs text-content-primary">{skill}</span>
                      </label>
                    ))
                  )}
                </div>
                {/* Custom skill input — same gate as modal (superintendent/admin/owner) */}
                {canEdit && (
                  <div className="px-3 py-2 border-t border-teal/20 flex items-center gap-2">
                    <input
                      type="text"
                      value={customSkillInput}
                      onChange={(e) => setCustomSkillInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddCustomSkill(); }}
                      placeholder="Custom skill…"
                      className="flex-1 text-xs bg-surface-overlay border border-surface-border rounded px-2 py-1 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-teal"
                    />
                    <button
                      onClick={handleAddCustomSkill}
                      className="text-xs px-2.5 py-1 bg-surface-overlay border border-surface-border rounded hover:border-teal/40 text-content-secondary transition-colors"
                    >
                      Add
                    </button>
                  </div>
                )}
                <div className="px-3 py-2 border-t border-teal/20 flex items-center gap-2">
                  <button
                    onClick={handlePickerDone}
                    className="px-3 py-1 text-[10px] font-semibold bg-teal text-white rounded hover:opacity-90 transition-opacity"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => { setShowSkillPicker(false); setPickerSelected(new Set()); }}
                    className="text-[10px] text-content-muted hover:text-content-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── Availability ───────────────────────────────────────────── */}
          <section className="border-t border-surface-border pt-4 pb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Availability
            </h3>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${worker.available ? "bg-green-400" : "bg-content-muted"}`}
              />
              <span className="text-xs text-content-primary">
                {worker.available ? "Available" : "Unavailable"}
              </span>
            </div>
          </section>

        </div>
      )}
    </InspectorPanel>
  );
}
