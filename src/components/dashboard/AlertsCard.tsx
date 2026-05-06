"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Wrench, Shield, ClipboardCheck, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { MetricTile } from "@/components/ui/MetricTile";
import { useOrg } from "@/providers/OrgProvider";
import { getRoleGroup } from "@/lib/utils/roles";
import type { Alert, AlertType } from "@/types/domain";

const ALERT_ICON: Record<AlertType, React.ReactNode> = {
  safety:     <AlertTriangle  size={13} className="text-status-critical" />,
  schedule:   <Clock          size={13} className="text-status-warning"  />,
  equipment:  <Wrench         size={13} className="text-teal"            />,
  budget:     <Shield         size={13} className="text-status-warning"  />,
  inspection: <ClipboardCheck size={13} className="text-blue-brand"      />,
};

const ALERT_DOT: Record<AlertType, string> = {
  safety:     "bg-status-critical",
  schedule:   "bg-status-warning",
  equipment:  "bg-teal",
  budget:     "bg-status-warning",
  inspection: "bg-blue-brand",
};

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function AlertsCard() {
  const { role, currentProject, alerts: allAlerts } = useOrg();
  const roleGroup = getRoleGroup(role);

  let alerts: Alert[] = [...allAlerts];

  // Role-based filtering and ordering
  if (roleGroup === "field") {
    alerts = alerts.filter((a) => a.project_id === currentProject.id);
  } else if (roleGroup === "maintenance") {
    // Equipment alerts first
    alerts = [
      ...alerts.filter((a) => a.type === "equipment"),
      ...alerts.filter((a) => a.type !== "equipment"),
    ];
  }

  const unread = alerts.filter((a) => !a.is_read);
  const shown  = alerts.slice(0, 4);

  return (
    <Card variant={unread.length > 0 ? "accent-gold" : "default"}>
      <div className="flex items-start justify-between mb-4">
        <MetricTile
          label="Alerts"
          value={unread.length}
          accentColor={unread.length > 0 ? "red" : "green"}
          delta={unread.length === 0 ? { value: 0, direction: "neutral", label: "unread" } : undefined}
        />
        <Link href="/alerts" className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1">
          View all <ArrowRight size={11} />
        </Link>
      </div>

      <div className="space-y-2">
        {shown.map((alert) => (
          <Link
            key={alert.id}
            href={`/alerts/${alert.id}`}
            className={`flex items-start gap-2.5 rounded-md px-1.5 py-1 -mx-1.5 hover:bg-surface-overlay transition-colors group ${alert.is_read ? "opacity-50" : ""}`}
          >
            <div className="shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded bg-surface-overlay border border-surface-border group-hover:border-surface-border-hover transition-colors">
              {ALERT_ICON[alert.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-content-primary leading-snug group-hover:text-content-primary">{alert.message}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${alert.is_read ? "bg-surface-border" : ALERT_DOT[alert.type]}`} />
              <span className="text-[10px] text-content-muted">{relativeTime(alert.created_at)}</span>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
