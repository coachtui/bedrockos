"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, X, AlertTriangle } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import { useShellEmitter } from "@/hooks/useShellEmitter";
import { createIssuePhotoUploadUrl } from "@/lib/actions/issues";
import type { IssueSeverity } from "@/types/domain";
import type { ModuleId } from "@/types/org";

const SEVERITY_OPTIONS: { value: IssueSeverity; label: string; styleActive: string }[] = [
  { value: "critical", label: "Critical", styleActive: "border-status-critical/40 bg-status-critical/15 text-status-critical" },
  { value: "high",     label: "High",     styleActive: "border-status-warning/40  bg-status-warning/15  text-status-warning"  },
  { value: "medium",   label: "Medium",   styleActive: "border-blue-brand/40      bg-blue-brand/15      text-blue-brand"      },
  { value: "low",      label: "Low",      styleActive: "border-surface-border-hover bg-surface-overlay text-content-secondary" },
];

type AccentKey = "blue" | "red";

const ACCENT_CLASSES: Record<AccentKey, {
  focusBorder: string;
  submitBg:    string;
  photoChip:   string;
}> = {
  blue: {
    focusBorder: "focus:border-blue-brand",
    submitBg:    "bg-blue-brand text-white hover:opacity-90",
    photoChip:   "bg-blue-brand/10 border-blue-brand/30 text-blue-brand",
  },
  red: {
    focusBorder: "focus:border-status-critical",
    submitBg:    "bg-status-critical text-white hover:opacity-90",
    photoChip:   "bg-status-critical/10 border-status-critical/30 text-status-critical",
  },
};

interface TaskFindingFormProps {
  module: ModuleId;
  accent: AccentKey;
  copy: {
    titleLabel:        string;
    titlePlaceholder:  string;
    notesPlaceholder:  string;
    submitLabel:       string;
    successMessage:    string;
  };
}

export function TaskFindingForm({ module, accent, copy }: TaskFindingFormProps) {
  const { currentProject } = useOrg();
  const { tasks }          = useCx();
  const { emitIssue }      = useShellEmitter();
  const router             = useRouter();

  const projectTasks = tasks.filter((t) => t.projectId === currentProject.id);

  const [taskId, setTaskId]           = useState<string>("");
  const [title, setTitle]             = useState<string>("");
  const [severity, setSeverity]       = useState<IssueSeverity>("medium");
  const [notes, setNotes]             = useState<string>("");
  const [photos, setPhotos]           = useState<{ name: string; storagePath: string }[]>([]);
  const [error, setError]             = useState<string | null>(null);
  const [uploading, setUploading]     = useState<boolean>(false);
  const [pending, startTransition]    = useTransition();
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const canSubmit = !!title.trim() && !!taskId && !uploading && !pending;

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of files) {
        const urlResult = await createIssuePhotoUploadUrl(file.name);
        if (urlResult.error || !urlResult.uploadUrl || !urlResult.storagePath) {
          setError(urlResult.error ?? "Could not prepare upload.");
          continue;
        }
        const uploadRes = await fetch(urlResult.uploadUrl, {
          method:  "PUT",
          body:    file,
          headers: { "Content-Type": file.type },
        });
        if (!uploadRes.ok) {
          setError(`Upload failed for ${file.name}.`);
          continue;
        }
        const path = urlResult.storagePath;
        setPhotos((prev) => [...prev, { name: file.name, storagePath: path }]);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removePhoto(storagePath: string) {
    setPhotos((prev) => prev.filter((p) => p.storagePath !== storagePath));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);

    const task = projectTasks.find((t) => t.id === taskId);
    if (!task) {
      setError("Pick a task first.");
      return;
    }

    startTransition(() => {
      const id = emitIssue({
        title:           title.trim(),
        module,
        severity,
        projectId:       currentProject.id,
        description:     notes.trim() || undefined,
        relatedTaskId:   taskId,
        photoPaths:      photos.map((p) => p.storagePath),
      });
      setSubmittedId(id);
      setTaskId("");
      setTitle("");
      setSeverity("medium");
      setNotes("");
      setPhotos([]);
      router.refresh();
    });
  }

  const { focusBorder, submitBg, photoChip } = ACCENT_CLASSES[accent];

  return (
    <>
      {submittedId && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-teal/10 border border-teal/30 text-teal text-xs flex items-center justify-between">
          <span>{copy.successMessage}</span>
          <Link href={`/issues/${submittedId}`} className="font-semibold underline-offset-2 hover:underline">
            View
          </Link>
        </div>
      )}
      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-status-critical/10 border border-status-critical/30 text-status-critical text-xs flex items-center gap-2">
          <AlertTriangle size={12} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-widest text-content-muted mb-2">Task</label>
          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg bg-surface-overlay border border-surface-border ${focusBorder} outline-none text-sm text-content-primary`}
            required
          >
            <option value="">— pick a task on {currentProject.name} —</option>
            {projectTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {projectTasks.length === 0 && (
            <p className="mt-1 text-xs text-content-muted">No tasks on this project yet — add one in CX first.</p>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-widest text-content-muted mb-2">{copy.titleLabel}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={copy.titlePlaceholder}
            className={`w-full px-3 py-2 rounded-lg bg-surface-overlay border border-surface-border ${focusBorder} outline-none text-sm text-content-primary`}
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-widest text-content-muted mb-2">Severity</label>
          <div className="flex flex-wrap gap-2">
            {SEVERITY_OPTIONS.map((opt) => {
              const isActive = opt.value === severity;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSeverity(opt.value)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    isActive
                      ? opt.styleActive
                      : "border-surface-border bg-surface-overlay text-content-muted hover:border-surface-border-hover hover:text-content-primary"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-widest text-content-muted mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder={copy.notesPlaceholder}
            className={`w-full px-3 py-2 rounded-lg bg-surface-overlay border border-surface-border ${focusBorder} outline-none text-sm text-content-primary resize-none`}
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-widest text-content-muted mb-2">Photos</label>
          <div className="flex flex-wrap items-center gap-2">
            {photos.map((p) => (
              <div key={p.storagePath} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs ${photoChip}`}>
                <Camera size={11} />
                <span className="truncate max-w-[160px]">{p.name}</span>
                <button type="button" onClick={() => removePhoto(p.storagePath)} className="hover:text-content-primary">
                  <X size={11} />
                </button>
              </div>
            ))}
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border bg-surface-overlay text-content-secondary hover:border-surface-border-hover hover:text-content-primary text-xs font-semibold transition-colors">
              <Camera size={12} />
              {uploading ? "Uploading…" : "Add photos"}
              <input type="file" accept="image/*" multiple onChange={handlePhotoSelect} disabled={uploading} className="hidden" />
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={`px-4 py-2 rounded-lg ${submitBg} text-sm font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {pending ? "Filing…" : copy.submitLabel}
        </button>
      </form>
    </>
  );
}
