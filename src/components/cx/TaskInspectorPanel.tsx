"use client";

import { useState, useEffect } from "react";
import { InspectorPanel } from "@/components/ui/InspectorPanel";
import type { CxTask, CxTaskType, CxTaskStatus, CxCrewRequirement, CreateCxTaskInput } from "@/lib/cx/types";
import type { WorkerRole } from "@/types/domain";
import { Plus, Trash2, UserMinus } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";

const TASK_TYPES: CxTaskType[] = [
  "pour", "inspection", "delivery", "grading",
  "concrete", "framing", "electrical", "excavation",
  "utility", "paving", "demolition", "other",
];

const TASK_TYPE_LABEL: Record<CxTaskType, string> = {
  pour:        "Pour",
  inspection:  "Inspection",
  delivery:    "Delivery",
  grading:     "Grading",
  concrete:    "Concrete Work",
  framing:     "Framing",
  electrical:  "Electrical",
  excavation:  "Excavation",
  utility:     "Utility",
  paving:      "Paving",
  demolition:  "Demolition",
  other:       "Other",
};

const TASK_STATUSES: CxTaskStatus[] = [
  "not_started", "in_progress", "on_hold", "complete",
];

const TASK_STATUS_LABEL: Record<CxTaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  on_hold:     "On Hold",
  complete:    "Complete",
};

const CREW_ROLES: WorkerRole[] = [
  "mason", "laborer", "operator", "carpenter",
  "foreman", "superintendent", "mechanic", "driver",
];

interface TaskInspectorPanelProps {
  open:       boolean;
  onClose:    () => void;
  projectId:  string;
  task?:      CxTask;
  onSave:     (data: CreateCxTaskInput) => void;
}

interface FormState {
  name: string;
  type: CxTaskType;
  startDate: string;
  endDate: string;
  location: string;
  status: CxTaskStatus;
  notes: string;
  reqs: CxCrewRequirement[];
}

function getInitialState(task?: CxTask): FormState {
  if (task) {
    return {
      name: task.name,
      type: task.type,
      startDate: task.startDate ?? "",
      endDate: task.endDate ?? "",
      location: task.location ?? "",
      status: task.status,
      notes: task.notes ?? "",
      reqs: task.crewRequirements,
    };
  }
  return {
    name: "",
    type: "pour",
    startDate: "",
    endDate: "",
    location: "",
    status: "not_started",
    notes: "",
    reqs: [],
  };
}

export function TaskInspectorPanel({
  open,
  onClose,
  projectId,
  task,
  onSave,
}: TaskInspectorPanelProps) {
  const isEdit = !!task;

  const { workers, role } = useOrg();
  const { updateTask } = useCx();

  const canAssign = isEdit && (
    role === "superintendent" ||
    role === "project_engineer" ||
    role === "owner" ||
    role === "admin"
  );

  const assignedWorkerIds = task?.assignedWorkerIds ?? [];
  const projectRoster = workers.filter((w) => w.projectId === projectId);

  function toggleWorker(workerId: string) {
    if (!task) return;
    const current = task.assignedWorkerIds;
    const next = current.includes(workerId)
      ? current.filter((id) => id !== workerId)
      : [...current, workerId];
    updateTask(task.id, { assignedWorkerIds: next });
  }

  const [formState, setFormState] = useState<FormState>(() => getInitialState(task));

  const { name, type, startDate, endDate, location, status, notes, reqs } = formState;

  const setName = (val: string) => setFormState((prev) => ({ ...prev, name: val }));
  const setType = (val: CxTaskType) => setFormState((prev) => ({ ...prev, type: val }));
  const setStartDate = (val: string) => setFormState((prev) => ({ ...prev, startDate: val }));
  const setEndDate = (val: string) => setFormState((prev) => ({ ...prev, endDate: val }));
  const setLocation = (val: string) => setFormState((prev) => ({ ...prev, location: val }));
  const setStatus = (val: CxTaskStatus) => setFormState((prev) => ({ ...prev, status: val }));
  const setNotes = (val: string) => setFormState((prev) => ({ ...prev, notes: val }));

  useEffect(() => {
    if (open) {
      setFormState(getInitialState(task));
    }
  }, [open, task]);

  function addReq() {
    setFormState((prev) => ({ ...prev, reqs: [...prev.reqs, { role: "laborer" as WorkerRole, count: 1 }] }));
  }

  function updateReq(i: number, patch: Partial<CxCrewRequirement>) {
    setFormState((prev) => ({
      ...prev,
      reqs: prev.reqs.map((r, idx) => idx === i ? { ...r, ...patch } : r),
    }));
  }

  function removeReq(i: number) {
    setFormState((prev) => ({
      ...prev,
      reqs: prev.reqs.filter((_, idx) => idx !== i),
    }));
  }

  function handleSave() {
    if (!name.trim() || !startDate || !endDate) return;
    onSave({
      projectId,
      name:              name.trim(),
      type,
      startDate,
      endDate,
      location:          location.trim() || undefined,
      status,
      crewRequirements:  reqs,
      assignedWorkerIds: task?.assignedWorkerIds ?? [], // live from CxProvider via derived selectedTask prop
      notes:             notes.trim() || undefined,
    });
    onClose();
  }

  const fieldClass   = "w-full bg-surface-overlay border border-surface-border rounded px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold/50";
  const labelClass   = "block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1";
  const sectionClass = "px-5 py-4 border-b border-surface-border";

  return (
    <InspectorPanel
      open={open}
      onClose={onClose}
      title={isEdit ? task!.name : "New Task"}
      subtitle={isEdit ? "Edit Task" : "Site Task · Create"}
    >
      <div className={sectionClass}>
        <label className={labelClass}>Task Name</label>
        <input
          className={fieldClass}
          placeholder="e.g. North Wall Pour"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className={`${sectionClass} grid grid-cols-2 gap-3`}>
        <div>
          <label className={labelClass}>Type</label>
          <select className={fieldClass} value={type} onChange={(e) => setType(e.target.value as CxTaskType)}>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>{TASK_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value as CxTaskStatus)}>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>{TASK_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={`${sectionClass} grid grid-cols-2 gap-3`}>
        <div>
          <label className={labelClass}>Start Date</label>
          <input type="date" className={fieldClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>End Date</label>
          <input type="date" className={fieldClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className={sectionClass}>
        <label className={labelClass}>Location</label>
        <input
          className={fieldClass}
          placeholder="e.g. Grid B-4, 2nd floor east"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div className={sectionClass}>
        <div className="flex items-center justify-between mb-2">
          <label className={labelClass} style={{ marginBottom: 0 }}>Crew Requirements</label>
          <button
            onClick={addReq}
            className="flex items-center gap-1 text-[10px] font-semibold text-gold hover:text-gold/80 transition-colors"
          >
            <Plus size={11} /> Add Role
          </button>
        </div>
        {reqs.length === 0 && (
          <p className="text-xs text-content-muted italic">No requirements set &mdash; staffing status won&apos;t be calculated.</p>
        )}
        {reqs.map((req, i) => (
          <div key={i} className="flex items-center gap-2 mt-2">
            <select
              className={`${fieldClass} flex-1`}
              value={req.role}
              onChange={(e) => updateReq(i, { role: e.target.value as WorkerRole })}
            >
              {CREW_ROLES.map((r) => (
                <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={99}
              className={`${fieldClass} w-16 text-center`}
              value={req.count}
              onChange={(e) => updateReq(i, { count: Math.max(1, parseInt(e.target.value) || 1) })}
            />
            <button
              onClick={() => removeReq(i)}
              className="p-1.5 text-content-muted hover:text-red-400 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {isEdit && (
        <div className={sectionClass}>
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass} style={{ marginBottom: 0 }}>
              Assigned Workers · {assignedWorkerIds.length}
            </label>
          </div>

          {assignedWorkerIds.length === 0 && (
            <p className="text-xs text-content-muted italic mb-2">No workers assigned yet.</p>
          )}

          {assignedWorkerIds.map((id) => {
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
                {canAssign && (
                  <button
                    onClick={() => toggleWorker(id)}
                    className="p-1 text-content-muted hover:text-status-critical transition-colors"
                    title="Remove from task"
                  >
                    <UserMinus size={14} />
                  </button>
                )}
              </div>
            );
          })}

          {canAssign && projectRoster.filter((w) => !assignedWorkerIds.includes(w.id)).length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mt-3 mb-1">
                Add from Roster
              </p>
              {projectRoster
                .filter((w) => !assignedWorkerIds.includes(w.id))
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
                      onClick={() => toggleWorker(w.id)}
                      className="p-1 text-content-muted hover:text-gold transition-colors"
                      title="Add to task"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                ))}
            </>
          )}
        </div>
      )}

      <div className={sectionClass}>
        <label className={labelClass}>Notes</label>
        <textarea
          className={`${fieldClass} resize-none`}
          rows={3}
          placeholder="Optional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="px-5 py-4">
        <button
          onClick={handleSave}
          disabled={!name.trim() || !startDate || !endDate}
          className="w-full py-2.5 rounded-lg bg-gold hover:bg-gold/90 text-black text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isEdit ? "Save Changes" : "Create Task"}
        </button>
      </div>
    </InspectorPanel>
  );
}
