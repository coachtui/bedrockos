"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import type { ScheduleMessage } from "@/lib/schedule/types";

export function ResourceAlertCard({ message }: { message: ScheduleMessage }) {
  return (
    <div className="bg-status-warning/5 border border-status-warning/25 rounded-[var(--radius-card)] p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <AlertTriangle size={12} className="text-status-warning" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-status-warning">Resource Alert</span>
        <span className="ml-auto text-[10px] text-content-muted">
          {new Date(message.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
      <p className="text-[11px] text-content-secondary whitespace-pre-wrap leading-relaxed">
        {message.body}
      </p>
    </div>
  );
}
