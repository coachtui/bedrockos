"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useOrg } from "@/providers/OrgProvider";
import { TaskFindingForm } from "@/components/modules/TaskFindingForm";

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function SafetyPage() {
  const { currentProject, issues } = useOrg();

  const recent = issues
    .filter((i) => i.module === "safety" && i.project_id === currentProject.id)
    .slice(0, 8);

  return (
    <PageContainer>
      <div className="rounded-[var(--radius-card)] border border-status-critical/30 bg-gradient-to-br from-surface-raised to-surface-overlay p-8 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-status-critical" />
          <span className="text-xs font-bold uppercase tracking-widest text-status-critical">Module</span>
        </div>
        <h1 className="text-2xl font-bold text-content-primary">SX</h1>
        <p className="text-content-secondary mt-2 max-w-md leading-relaxed">
          Log a near-miss, hazard, or incident on a task. Photos optional. Audit-ready records.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card variant="default">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={16} className="text-status-critical" />
              <p className="text-sm font-bold text-content-primary">Report a Safety Event</p>
            </div>
            <TaskFindingForm
              module="safety"
              accent="red"
              copy={{
                titleLabel:       "Event",
                titlePlaceholder: "Near-miss, hazard, or incident — what happened?",
                notesPlaceholder: "Who was involved, when, conditions, contributing factors…",
                submitLabel:      "File Safety Event",
                successMessage:   "Safety event logged.",
              }}
            />
          </Card>
        </div>

        <div>
          <Card variant="default">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted">Recent on {currentProject.name}</p>
              <Link href="/issues?source=safety" className="text-[11px] text-content-muted hover:text-status-critical transition-colors flex items-center gap-1">
                All <ArrowRight size={10} />
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-xs text-content-muted">No safety events logged on this project.</p>
            ) : (
              <ul className="space-y-2">
                {recent.map((issue) => (
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
