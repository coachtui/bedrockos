"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import type { CreateProjectInput } from "@/types/domain";

interface Props {
  onClose:   () => void;
  onCreated: (projectId: string) => void;
}

const PHASES = [
  "Pre-Construction", "Foundation", "Structural", "MEP",
  "Finishes", "Closeout", "Planning",
];

export function CreateProjectModal({ onClose, onCreated }: Props) {
  const { currentUser, addProject } = useOrg();

  const [form, setForm] = useState({
    name:        "",
    location:    "",
    phase:       "Pre-Construction",
    pmName:      currentUser.name,
    startDate:   "",
    endDate:     "",
    description: "",
    awardPrice:  "",
  });
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim())     { setError("Project name is required."); return; }
    if (!form.location.trim()) { setError("Location is required."); return; }
    if (!form.startDate)       { setError("Start date is required."); return; }
    if (!form.endDate)         { setError("End date is required."); return; }

    const input: CreateProjectInput = {
      name:        form.name.trim(),
      location:    form.location.trim(),
      phase:       form.phase,
      pmName:      form.pmName.trim() || currentUser.name,
      startDate:   form.startDate,
      endDate:     form.endDate,
      description: form.description.trim() || undefined,
      awardPrice:  form.awardPrice ? Number(form.awardPrice) : undefined,
    };

    const project = addProject(input);
    onCreated(project.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface-base border border-surface-border rounded-[var(--radius-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-content-primary">Create Project</h2>
          <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</p>
          )}

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Project Name</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Highland Tower — Phase 3"
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Location</label>
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Dallas, TX"
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Phase</label>
            <select
              value={form.phase}
              onChange={(e) => set("phase", e.target.value)}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
            >
              {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Project Manager</label>
            <input
              value={form.pmName}
              onChange={(e) => set("pmName", e.target.value)}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              Description{" "}
              <span className="text-content-muted font-normal">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Brief description of project scope and objectives..."
              rows={3}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              Award Price{" "}
              <span className="text-content-muted font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
              <input
                type="number"
                value={form.awardPrice}
                onChange={(e) => set("awardPrice", e.target.value)}
                placeholder="0"
                className="w-full text-sm bg-surface-overlay border border-surface-border rounded pl-7 pr-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-content-secondary hover:text-content-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
