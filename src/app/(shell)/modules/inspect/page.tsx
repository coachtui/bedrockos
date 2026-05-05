"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Camera, X, AlertTriangle, ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import { useShellEmitter } from "@/hooks/useShellEmitter";
import { createIssuePhotoUploadUrl } from "@/lib/actions/issues";
import type { IssueSeverity } from "@/types/domain";

const SEVERITY_OPTIONS: { value: IssueSeverity; label: string; styleActive: string }[] = [
  { value: "critical", label: "Critical", styleActive: "border-status-critical/40 bg-status-critical/15 text-status-critical" },
  { value: "high",     label: "High",     styleActive: "border-status-warning/40  bg-status-warning/15  text-status-warning"  },
  { value: "medium",   label: "Medium",   styleActive: "border-blue-brand/40      bg-blue-brand/15      text-blue-brand"      },
  { value: "low",      label: "Low",      styleActive: "border-surface-border-hover bg-surface-overlay text-content-secondary" },
];

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function InspectPage() {
  const { currentProject, issues } = useOrg();
  const { tasks } = useCx();
  const { emitIssue } = useShellEmitter();
  const router = useRouter();

  const projectTasks = tasks.filter((t) => t.projectId === currentProject.id);
  const inspectIssues = issues
    .filter((i) => i.module === "inspect" && i.project_id === currentProject.id)
    .slice(0, 8);

  const [taskId, setTaskId]         = useState<string>("");
  const [title, setTitle]           = useState<string>("");
  const [severity, setSeverity]     = useState<IssueSeverity>("medium");
  const [notes, setNotes]           = useState<string>("");
  const [photos, setPhotos]         = useState<{ name: string; storagePath: string }[]>([]);
  const [error, setError]           = useState<string | null>(null);
  const [uploading, setUploading]   = useState<boolean>(false);
  const [pending, startTransition]  = useTransition();
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
        module:          "inspect",
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

  return (
    <PageContainer>
      <div className="rounded-[var(--radius-card)] border border-blue-brand/30 bg-gradient-to-br from-surface-raised to-surface-overlay p-8 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-blue-brand" />
          <span className="text-xs font-bold uppercase tracking-widest text-blue-brand">Module</span>
        </div>
        <h1 className="text-2xl font-bold text-content-primary">Inspect</h1>
        <p className="text-content-secondary mt-2 max-w-md leading-relaxed">
          Walk a task, capture conditions, file an issue. The supe and foreman see it on their dashboards.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card variant="default">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardCheck size={16} className="text-blue-brand" />
              <p className="text-sm font-bold text-content-primary">Inspect a Task</p>
            </div>

            {submittedId && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-teal/10 border border-teal/30 text-teal text-xs flex items-center justify-between">
                <span>Issue filed.</span>
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
                  className="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-surface-border focus:border-blue-brand outline-none text-sm text-content-primary"
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
                <label className="block text-[11px] font-bold uppercase tracking-widest text-content-muted mb-2">Finding</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short summary of what you observed"
                  className="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-surface-border focus:border-blue-brand outline-none text-sm text-content-primary"
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
                  placeholder="Conditions, dimensions, what is blocking the next step…"
                  className="w-full px-3 py-2 rounded-lg bg-surface-overlay border border-surface-border focus:border-blue-brand outline-none text-sm text-content-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-content-muted mb-2">Photos</label>
                <div className="flex flex-wrap items-center gap-2">
                  {photos.map((p) => (
                    <div key={p.storagePath} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-brand/10 border border-blue-brand/30 text-blue-brand text-xs">
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
                className="px-4 py-2 rounded-lg bg-blue-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? "Filing…" : "File Issue"}
              </button>
            </form>
          </Card>
        </div>

        <div>
          <Card variant="default">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted">Recent on {currentProject.name}</p>
              <Link href="/issues?source=inspect" className="text-[11px] text-content-muted hover:text-blue-brand transition-colors flex items-center gap-1">
                All <ArrowRight size={10} />
              </Link>
            </div>
            {inspectIssues.length === 0 ? (
              <p className="text-xs text-content-muted">No inspect issues yet on this project.</p>
            ) : (
              <ul className="space-y-2">
                {inspectIssues.map((issue) => (
                  <li key={issue.id}>
                    <Link
                      href={`/issues/${issue.id}`}
                      className="block px-2 py-2 -mx-2 rounded-md hover:bg-surface-overlay transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-content-primary leading-snug truncate">{issue.title}</span>
                        <StatusBadge status={issue.severity} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-content-muted">
                        <StatusBadge status={issue.status} size="sm" />
                        <span>·</span>
                        <span>{relativeTime(issue.created_at)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
