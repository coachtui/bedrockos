"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { useMx } from "@/providers/MxProvider";
import type { CreateMxWorkOrderInput, MxWorkOrderCategory, MxWorkOrderPriority, ReadinessStatus } from "@/lib/mx/types";
import { CATEGORY_LABELS, PRIORITY_LABELS, READINESS_LABELS } from "@/lib/mx/rules";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  onClose:   () => void;
  onCreated: (woId: string) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: MxWorkOrderCategory[] = [
  "corrective", "preventive", "emergency", "inspection", "modification",
];

const PRIORITIES: MxWorkOrderPriority[] = ["critical", "high", "medium", "low"];

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateWorkOrderModal({ onClose, onCreated }: Props) {
  const { currentUser, currentProject, assets, projects } = useOrg();
  const { createWorkOrder } = useMx();

  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    title:           "",
    description:     "",
    category:        "corrective" as MxWorkOrderCategory,
    priority:        "medium" as MxWorkOrderPriority,
    equipmentId:     "",
    projectId:       currentProject.id,
    neededByDate:    "",
    readinessImpact: "none" as ReadinessStatus | "none",
    opsBlocking:     false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const selectedAsset   = assets.find((a) => a.id === form.equipmentId);
  const selectedProject = projects.find((p) => p.id === form.projectId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required."); return; }

    setSubmitting(true);
    setError("");

    const input: CreateMxWorkOrderInput = {
      title:              form.title.trim(),
      description:        form.description.trim() || undefined,
      category:           form.category,
      priority:           form.priority,
      equipmentId:        selectedAsset?.id,
      equipmentLabel:     selectedAsset?.name,
      projectId:          selectedProject?.id,
      projectName:        selectedProject?.name,
      requestedBy:        currentUser.name,
      requestedByUserId:  currentUser.id,
      requestedDate:      today,
      neededByDate:       form.neededByDate || undefined,
      readinessImpact:    form.readinessImpact === "none" ? null : form.readinessImpact,
      opsBlocking:        form.opsBlocking,
    };

    try {
      const wo = createWorkOrder(input);
      onCreated(wo.id);
    } catch {
      setError("Failed to create work order. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-surface-raised border border-surface-border rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div>
            <h2 className="text-sm font-bold text-content-primary">New Work Order</h2>
            <p className="text-xs text-content-muted mt-0.5">Will open as status: Open</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-overlay text-content-muted transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-content-secondary mb-1.5">
              Title <span className="text-status-critical">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Replace hydraulic hose — Cat 336"
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-teal"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-content-secondary mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What needs to be done and why"
              rows={3}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-teal resize-none"
            />
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-content-secondary mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value as MxWorkOrderCategory)}
                className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-primary focus:outline-none focus:border-teal cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-content-secondary mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as MxWorkOrderPriority)}
                className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-primary focus:outline-none focus:border-teal cursor-pointer"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className="block text-xs font-semibold text-content-secondary mb-1.5">Equipment</label>
            <select
              value={form.equipmentId}
              onChange={(e) => set("equipmentId", e.target.value)}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-primary focus:outline-none focus:border-teal cursor-pointer"
            >
              <option value="">— No equipment linked —</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="block text-xs font-semibold text-content-secondary mb-1.5">Project / Location</label>
            <select
              value={form.projectId}
              onChange={(e) => set("projectId", e.target.value)}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-primary focus:outline-none focus:border-teal cursor-pointer"
            >
              <option value="">— No project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Requested by + Needed by */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-content-secondary mb-1.5">Requested By</label>
              <input
                type="text"
                value={currentUser.name}
                readOnly
                className="w-full text-sm bg-surface-overlay/50 border border-surface-border rounded-lg px-3 py-2 text-content-muted cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-content-secondary mb-1.5">Needed By</label>
              <input
                type="date"
                value={form.neededByDate}
                onChange={(e) => set("neededByDate", e.target.value)}
                min={today}
                className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-primary focus:outline-none focus:border-teal"
              />
            </div>
          </div>

          {/* Readiness Impact */}
          <div>
            <label className="block text-xs font-semibold text-content-secondary mb-1.5">Readiness Impact</label>
            <select
              value={form.readinessImpact}
              onChange={(e) => set("readinessImpact", e.target.value as ReadinessStatus | "none")}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-primary focus:outline-none focus:border-teal cursor-pointer"
            >
              <option value="none">— No impact declared —</option>
              {(Object.keys(READINESS_LABELS) as ReadinessStatus[]).map((r) => (
                <option key={r} value={r}>{READINESS_LABELS[r]}</option>
              ))}
            </select>
            <p className="text-[10px] text-content-muted mt-1">
              How will this WO affect equipment availability when open?
            </p>
          </div>

          {/* OPS Blocking */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.opsBlocking}
              onChange={(e) => set("opsBlocking", e.target.checked)}
              className="rounded accent-teal"
            />
            <span className="text-sm text-content-secondary">
              OPS blocking — this WO prevents equipment use in operations
            </span>
          </label>

          {/* Error */}
          {error && (
            <p className="text-xs text-status-critical">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-teal hover:opacity-90 text-white text-sm font-semibold rounded-lg transition-opacity disabled:opacity-50"
            >
              Create Work Order
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
