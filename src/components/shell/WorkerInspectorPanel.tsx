"use client";

import { useState, useEffect } from "react";
import { InspectorPanel } from "@/components/ui/InspectorPanel";
import { useOrg } from "@/providers/OrgProvider";
import { relativeTime } from "@/lib/utils/time";
import type { UserRole } from "@/types/org";
import type { ProjectPosition, WorkerProjectRole, WorkerRole } from "@/types/domain";

const WORKER_ROLES: WorkerRole[] = [
  "mason", "laborer", "operator", "carpenter",
  "foreman", "superintendent", "mechanic", "driver",
];

const CAN_EDIT           = new Set<UserRole>(["owner", "admin", "superintendent"]);
const CAN_CHANGE_PROJECT = new Set<UserRole>(["owner", "admin"]);

interface WorkerInspectorPanelProps {
  workerId: string | null;
  onClose:  () => void;
}

export function WorkerInspectorPanel({ workerId, onClose }: WorkerInspectorPanelProps) {
  const {
    workers, crews, projects, skillCatalog,
    currentProject, role, activity,
    updateWorkerBasicInfo, updateWorkerSkills, reassignWorker, addSkillToRole,
    toggleWorkerAvailability,
    workerProjectRoles, assignProjectPosition, removeProjectPosition,
  } = useOrg();

  const worker = workerId ? (workers.find((w) => w.id === workerId) ?? null) : null;

  // Edit details state
  const [editDetails,    setEditDetails]    = useState(false);
  const [editName,       setEditName]       = useState("");
  const [editRole,       setEditRole]       = useState<WorkerRole>("laborer");

  // Reassign form state
  const [showReassign,      setShowReassign]      = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [selectedCrewId,    setSelectedCrewId]    = useState<string | undefined>();

  // Project position form state
  const [showAddPosition,     setShowAddPosition]     = useState(false);
  const [addPositionProjectId, setAddPositionProjectId] = useState("");
  const [addPositionRole,     setAddPositionRole]     = useState<ProjectPosition>("foreman");

  // Skills edit state
  const [editSkills,       setEditSkills]       = useState(false);
  const [showSkillPicker,  setShowSkillPicker]  = useState(false);
  const [pickerSelected,   setPickerSelected]   = useState<Set<string>>(new Set());
  const [customSkillInput, setCustomSkillInput] = useState("");

  // Reset all panel state whenever the selected worker changes
  useEffect(() => {
    setEditDetails(false);
    setEditName(worker?.name ?? "");
    setEditRole((worker?.role ?? "laborer") as WorkerRole);
    setShowReassign(false);
    setEditSkills(false);
    setShowSkillPicker(false);
    setPickerSelected(new Set());
    setCustomSkillInput("");
    setSelectedProjectId(worker?.projectId);
    setSelectedCrewId(undefined);
    setShowAddPosition(false);
    setAddPositionProjectId("");
    setAddPositionRole("foreman");
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

  // This worker's project-scoped position assignments
  const workerPositions: WorkerProjectRole[] = worker
    ? workerProjectRoles.filter((r) => r.workerId === worker.id)
    : [];

  // Skills not already on the worker (for picker)
  const availableSkills = worker
    ? (skillCatalog[worker.role] ?? []).filter((s) => !worker.skills.includes(s))
    : [];

  // Activity for this worker (mock + emitted)
  const workerActivity = worker
    ? activity
        .filter((e) => e.entity_type === "worker" && e.entity_id === worker.id)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
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

  function handleSaveDetails() {
    if (!worker) return;
    updateWorkerBasicInfo(worker.id, { name: editName, role: editRole });
    setEditDetails(false);
  }

  function handleConfirmReassign() {
    if (!worker) return;
    reassignWorker(worker.id, reassignProjectId, selectedCrewId);
    setShowReassign(false);
  }

  function handleAddPosition(): void {
    if (!worker || !addPositionProjectId) return;
    assignProjectPosition(worker.id, addPositionProjectId, addPositionRole);
    setAddPositionProjectId("");
    setAddPositionRole("foreman");
    setShowAddPosition(false);
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

          {/* ── Details ────────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted">
                Details
              </h3>
              {canEdit && !editDetails && (
                <button
                  onClick={() => setEditDetails(true)}
                  className="text-[10px] font-semibold text-content-muted hover:text-teal transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {!editDetails ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-content-muted">Name</span>
                  <span className="font-semibold text-content-primary">{worker.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-content-muted">Role</span>
                  <span className="font-semibold text-content-primary capitalize">{worker.role}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs bg-surface-overlay border border-surface-border rounded-lg px-2.5 py-1.5 text-content-primary focus:outline-none focus:border-teal"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1.5">
                    Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as WorkerRole)}
                    className="w-full text-xs bg-surface-overlay border border-surface-border rounded-lg px-2.5 py-1.5 text-content-primary focus:outline-none focus:border-teal"
                  >
                    {WORKER_ROLES.map((r) => (
                      <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSaveDetails}
                    className="px-3 py-1 text-[10px] font-semibold bg-teal text-white rounded hover:opacity-90 transition-opacity"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setEditDetails(false); setEditName(worker.name); setEditRole(worker.role as WorkerRole); }}
                    className="text-[10px] text-content-muted hover:text-content-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

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

          {/* ── Project Position ───────────────────────────────────────── */}
          {canEdit && (
            <section className="border-t border-surface-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-content-secondary uppercase tracking-wide">
                  Project Position
                </span>
                {!showAddPosition && (
                  <button
                    onClick={() => setShowAddPosition(true)}
                    className="text-xs text-blue-brand hover:underline"
                  >
                    + Assign
                  </button>
                )}
              </div>

              {workerPositions.length === 0 && !showAddPosition && (
                <p className="text-xs text-content-tertiary">No project positions assigned.</p>
              )}
              <ul className="space-y-1 mb-2">
                {workerPositions.map((pos) => {
                  const project = projects.find((p) => p.id === pos.projectId);
                  return (
                    <li key={pos.id} className="flex items-center justify-between text-xs">
                      <span className="text-content-primary">
                        {project?.name ?? pos.projectId}
                        <span className="ml-1 text-content-secondary capitalize">
                          — {pos.position}
                        </span>
                      </span>
                      <button
                        onClick={() => worker && removeProjectPosition(worker.id, pos.projectId)}
                        className="text-content-tertiary hover:text-red-500 ml-2"
                        aria-label="Remove position"
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>

              {showAddPosition && (
                <div className="space-y-2">
                  <select
                    value={addPositionProjectId}
                    onChange={(e) => setAddPositionProjectId(e.target.value)}
                    className="w-full text-xs border border-surface-border rounded px-2 py-1 bg-surface-base text-content-primary"
                  >
                    <option value="">Select project…</option>
                    {projects
                      .filter((p) => !workerPositions.some((r) => r.projectId === p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
                  <select
                    value={addPositionRole}
                    onChange={(e) => setAddPositionRole(e.target.value as ProjectPosition)}
                    className="w-full text-xs border border-surface-border rounded px-2 py-1 bg-surface-base text-content-primary"
                  >
                    <option value="foreman">Foreman</option>
                    <option value="superintendent">Superintendent</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddPosition}
                      disabled={!addPositionProjectId}
                      className="flex-1 text-xs bg-blue-brand text-white rounded px-2 py-1 disabled:opacity-40"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => setShowAddPosition(false)}
                      className="text-xs text-content-secondary hover:underline px-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

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
          <section className="border-t border-surface-border pt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Availability
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${worker.available ? "bg-green-400" : "bg-content-muted"}`}
                />
                <span className="text-xs text-content-primary">
                  {worker.available ? "Available" : "Needed on Site"}
                </span>
              </div>
              {canEdit && (
                <button
                  onClick={() => toggleWorkerAvailability(worker.id)}
                  className="text-[10px] font-semibold text-content-muted hover:text-teal transition-colors"
                >
                  {worker.available ? "Mark as needed on site" : "Mark as available"}
                </button>
              )}
            </div>
          </section>

          {/* ── Activity ───────────────────────────────────────────────────── */}
          <section className="border-t border-surface-border pt-4 pb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Activity
            </h3>
            {workerActivity.length === 0 ? (
              <p className="text-xs text-content-muted italic">No activity on record</p>
            ) : (
              <ul className="space-y-3">
                {workerActivity.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-3">
                    <p className="text-xs text-content-secondary leading-snug">
                      <span className="font-semibold text-content-primary">{event.actor_name}</span>
                      {" "}{event.action}
                    </p>
                    <span className="text-[10px] text-content-muted whitespace-nowrap flex-shrink-0">
                      {relativeTime(event.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>
      )}
    </InspectorPanel>
  );
}
