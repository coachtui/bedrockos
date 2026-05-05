"use client";

import React, { useTransition } from "react";
import { Mail, MailOpen } from "lucide-react";
import { serverSetAlertRead } from "@/lib/actions/alerts";

export function AlertReadToggle({ alertId, isRead }: { alertId: string; isRead: boolean }) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await serverSetAlertRead(alertId, !isRead);
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-50 ${
        isRead
          ? "border-surface-border bg-surface-overlay text-content-secondary hover:text-content-primary hover:border-surface-border-hover"
          : "border-gold/30 bg-gold/10 text-gold hover:bg-gold/15"
      }`}
    >
      {isRead ? <Mail size={14} /> : <MailOpen size={14} />}
      {pending ? "…" : isRead ? "Mark as Unread" : "Mark as Read"}
    </button>
  );
}
