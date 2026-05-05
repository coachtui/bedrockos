"use client";

import React, { useTransition } from "react";
import { CircleDot, CircleDashed, CheckCircle2 } from "lucide-react";
import { serverSetIssueStatus } from "@/lib/actions/issues";
import type { IssueStatus } from "@/types/domain";

const OPTIONS: { value: IssueStatus; label: string; icon: React.ReactNode; activeClass: string }[] = [
  {
    value:       "open",
    label:       "Open",
    icon:        <CircleDot size={14} />,
    activeClass: "border-status-warning/30 bg-status-warning/10 text-status-warning",
  },
  {
    value:       "in_progress",
    label:       "In Progress",
    icon:        <CircleDashed size={14} />,
    activeClass: "border-blue-brand/30 bg-blue-brand/10 text-blue-brand",
  },
  {
    value:       "resolved",
    label:       "Resolved",
    icon:        <CheckCircle2 size={14} />,
    activeClass: "border-teal/30 bg-teal/10 text-teal",
  },
];

export function IssueStatusButtons({ issueId, status }: { issueId: string; status: IssueStatus }) {
  const [pending, startTransition] = useTransition();

  function setStatus(next: IssueStatus) {
    if (next === status || pending) return;
    startTransition(async () => {
      await serverSetIssueStatus(issueId, next);
    });
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      {OPTIONS.map((opt) => {
        const isActive = opt.value === status;
        return (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            disabled={pending}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-50 ${
              isActive
                ? opt.activeClass
                : "border-surface-border bg-surface-overlay text-content-secondary hover:text-content-primary hover:border-surface-border-hover"
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
