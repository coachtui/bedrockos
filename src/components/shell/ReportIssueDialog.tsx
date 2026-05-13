"use client";

import React, { useState } from "react";
import { X, AlertTriangle, CheckCircle } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { useShellEmitter } from "@/hooks/useShellEmitter";
import type { ModuleId } from "@/types/org";
import type { IssueSeverity } from "@/types/domain";

const MODULE_OPTIONS: { value: ModuleId; label: string }[] = [
  { value: "cru",     label: "CX — Crew"       },
  { value: "fix",     label: "FX — Equipment"  },
  { value: "inspect", label: "IX — Inspection" },
  { value: "ops",     label: "OX — Operations" },
  { value: "mx",      label: "MX — Maintenance"},
  { value: "safety",  label: "SX — Safety"     },
  { value: "datum",   label: "DX — Layout"     },
];

const SEVERITY_OPTIONS: { value: IssueSeverity; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "high",     label: "High"     },
  { value: "medium",   label: "Medium"   },
  { value: "low",      label: "Low"      },
];

interface ReportIssueDialogProps {
  onClose: () => void;
}

export function ReportIssueDialog({ onClose }: ReportIssueDialogProps) {
  const { enabledModules, assets, currentProject } = useOrg();
  const { emitIssue, currentUser } = useShellEmitter();

  const moduleOptions = MODULE_OPTIONS.filter((m) => enabledModules.includes(m.value));

  const [title,       setTitle]       = useState("");
  const [module,      setModule]      = useState<ModuleId>(moduleOptions[0]?.value ?? "fix");
  const [severity,    setSeverity]    = useState<IssueSeverity>("high");
  const [assetId,     setAssetId]     = useState("");
  const [description, setDescription] = useState("");
  const [submitted,   setSubmitted]   = useState(false);
  const [error,       setError]       = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }

    emitIssue({
      title:       title.trim(),
      module,
      severity,
      projectId:   currentProject.id,
      assetId:     assetId || undefined,
      description: description.trim() || undefined,
    });

    setSubmitted(true);
    setTimeout(onClose, 1800);
  }

  const inputCls = "w-full rounded-lg border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold/50 transition-colors";
  const labelCls = "block text-xs font-semibold text-content-muted uppercase tracking-widest mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-[var(--radius-card)] border border-surface-border bg-surface-raised shadow-[var(--shadow-elevated)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-status-warning" />
            <span className="text-sm font-bold text-content-primary">Report Issue</span>
          </div>
          <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {submitted ? (
          <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle size={28} className="text-teal" />
            <p className="text-sm font-semibold text-content-primary">Issue reported</p>
            <p className="text-xs text-content-muted">Added to the issues queue</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {/* Title */}
            <div>
              <label className={labelCls}>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setError(""); }}
                placeholder="Briefly describe the issue"
                className={inputCls}
                autoFocus
              />
              {error && <p className="text-xs text-status-critical mt-1">{error}</p>}
            </div>

            {/* Module + Severity */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelCls}>Module</label>
                <select value={module} onChange={(e) => setModule(e.target.value as ModuleId)} className={inputCls}>
                  {moduleOptions.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className={labelCls}>Severity</label>
                <select value={severity} onChange={(e) => setSeverity(e.target.value as IssueSeverity)} className={inputCls}>
                  {SEVERITY_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Asset (optional) */}
            {assets.length > 0 && (
              <div>
                <label className={labelCls}>Asset (optional)</label>
                <select value={assetId} onChange={(e) => setAssetId(e.target.value)} className={inputCls}>
                  <option value="">— None —</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Description */}
            <div>
              <label className={labelCls}>Details (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened? Where? Any context that helps."
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Project context */}
            <p className="text-[11px] text-content-muted">
              Reporting against <span className="font-semibold text-content-secondary">{currentProject.name}</span>
              {currentUser?.name ? ` · by ${currentUser.name}` : ""}
            </p>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse text-sm font-semibold transition-colors"
              >
                Submit Issue
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-surface-border bg-surface-overlay text-content-secondary hover:text-content-primary text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
