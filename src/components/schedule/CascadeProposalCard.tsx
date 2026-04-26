"use client";

import React from "react";
import { GitBranch, Check, X } from "lucide-react";
import type { ScheduleMessage } from "@/lib/schedule/types";

interface Props {
  message:    ScheduleMessage;
  onConfirm:  (messageId: string) => void;
  onDismiss:  (messageId: string) => void;
}

export function CascadeProposalCard({ message, onConfirm, onDismiss }: Props) {
  const isDone = message.status === "confirmed" || message.status === "dismissed";

  return (
    <div className={`border rounded-[var(--radius-card)] p-3 transition-opacity ${
      isDone ? "opacity-50 border-surface-border" : "border-blue-brand/30 bg-blue-brand/5"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <GitBranch size={12} className="text-blue-brand" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-brand">
          {isDone ? (message.status === "confirmed" ? "Changes Applied" : "Dismissed") : "Schedule Proposal"}
        </span>
      </div>
      <p className="text-[11px] text-content-secondary whitespace-pre-wrap leading-relaxed">
        {message.body}
      </p>
      {!isDone && (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => onConfirm(message.id)}
            className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold bg-blue-brand text-white rounded hover:opacity-90 transition-opacity"
          >
            <Check size={10} /> Confirm
          </button>
          <button
            onClick={() => onDismiss(message.id)}
            className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold border border-surface-border text-content-muted rounded hover:border-surface-border-hover transition-colors"
          >
            <X size={10} /> Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
