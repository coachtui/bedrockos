"use client";

import { useState, useEffect } from "react";
import { InspectorPanel } from "@/components/ui/InspectorPanel";
import { useOrg } from "@/providers/OrgProvider";
import type { Project, ProjectStatus, UpdateProjectInput } from "@/types/domain";

const PHASES = [
  "Pre-Construction", "Foundation", "Structural", "MEP",
  "Finishes", "Closeout", "Planning",
];

const STATUSES: ProjectStatus[] = ["planning", "active", "on_hold", "completed"];

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning:  "Planning",
  active:    "Active",
  on_hold:   "On Hold",
  completed: "Completed",
};

interface FormState {
  name:        string;
  description: string;
  location:    string;
  phase:       string;
  pmName:      string;
  status:      ProjectStatus;
  startDate:   string;
  endDate:     string;
  awardPrice:  string;
}

function toForm(p: Project): FormState {
  return {
    name:        p.name,
    description: p.description ?? "",
    location:    p.location,
    phase:       p.phase,
    pmName:      p.pm_name,
    status:      p.status,
    startDate:   p.start_date,
    endDate:     p.end_date,
    awardPrice:  p.award_price != null ? String(p.award_price) : "",
  };
}

interface ProjectInspectorPanelProps {
  open:    boolean;
  onClose: () => void;
  project: Project;
}

export function ProjectInspectorPanel({ open, onClose, project }: ProjectInspectorPanelProps) {
  const { updateProject } = useOrg();
  const [form, setForm] = useState<FormState>(() => toForm(project));

  useEffect(() => {
    setForm(toForm(project));
  }, [project.id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    const patch: UpdateProjectInput = {
      name:        form.name.trim() || project.name,
      description: form.description.trim() || undefined,
      location:    form.location.trim() || project.location,
      phase:       form.phase,
      pm_name:     form.pmName.trim() || project.pm_name,
      status:      form.status,
      start_date:  form.startDate || project.start_date,
      end_date:    form.endDate   || project.end_date,
      award_price: form.awardPrice !== "" && Number(form.awardPrice) >= 0 ? Number(form.awardPrice) : undefined,
    };
    updateProject(project.id, patch);
    onClose();
  }

  const inputCls = "w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold/50";
  const labelCls = "block text-xs font-medium text-content-secondary mb-1";

  return (
    <InspectorPanel
      open={open}
      onClose={onClose}
      title="Edit Project"
      subtitle={project.name}
    >
      <div className="p-4 space-y-4">
        <div>
          <label className={labelCls}>Project Name</label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>
            Description{" "}
            <span className="text-content-muted font-normal">(optional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="Project scope and objectives..."
            className={`${inputCls} resize-none`}
          />
        </div>

        <div>
          <label className={labelCls}>Location</label>
          <input
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Phase</label>
            <select
              value={form.phase}
              onChange={(e) => set("phase", e.target.value)}
              className={inputCls}
            >
              {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as ProjectStatus)}
              className={inputCls}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Project Manager</label>
          <input
            value={form.pmName}
            onChange={(e) => set("pmName", e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>
            Award Price{" "}
            <span className="text-content-muted font-normal">(optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
            <input
              type="number"
              min="0"
              value={form.awardPrice}
              onChange={(e) => set("awardPrice", e.target.value)}
              placeholder="0"
              className={`${inputCls} pl-7`}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 md:min-h-0 px-4 py-2 text-sm md:text-xs text-content-secondary hover:text-content-primary active:opacity-70 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!form.name.trim()}
            className="px-4 py-2 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </InspectorPanel>
  );
}
