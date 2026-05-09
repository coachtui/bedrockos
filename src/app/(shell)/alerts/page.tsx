import React from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Wrench, Shield, ClipboardCheck, ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { fetchOrgAlerts } from "@/lib/supabase/alerts";
import type { AlertType, AlertSeverity } from "@/types/domain";
import { getEnvOrgId } from "@/lib/config/org";

export const metadata = { title: "Alerts" };

const ORG_ID = getEnvOrgId();

const TYPE_ICON: Record<AlertType, React.ReactNode> = {
  safety:     <AlertTriangle  size={14} className="text-status-critical" />,
  schedule:   <Clock          size={14} className="text-status-warning"  />,
  equipment:  <Wrench         size={14} className="text-teal"            />,
  budget:     <Shield         size={14} className="text-status-warning"  />,
  inspection: <ClipboardCheck size={14} className="text-blue-brand"      />,
};

const SEVERITY_STYLES: Record<AlertSeverity, { dot: string; badge: string }> = {
  critical: { dot: "bg-status-critical", badge: "text-status-critical border-status-critical/25 bg-status-critical/10" },
  warning:  { dot: "bg-status-warning",  badge: "text-status-warning  border-status-warning/25  bg-status-warning/10"  },
  info:     { dot: "bg-blue-brand",       badge: "text-blue-brand       border-blue-brand/25       bg-blue-brand/10"       },
};

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const SEVERITY_FILTERS: { label: string; value: AlertSeverity | "all" }[] = [
  { label: "All",      value: "all"      },
  { label: "Critical", value: "critical" },
  { label: "Warning",  value: "warning"  },
  { label: "Info",     value: "info"     },
];

type SearchParams = Promise<{ severity?: string }>;

export default async function AlertsPage({ searchParams }: { searchParams: SearchParams }) {
  const params   = await searchParams;
  const severity = typeof params.severity === "string" ? params.severity : "all";

  const alerts = await fetchOrgAlerts(ORG_ID);
  const filtered = alerts.filter((a) => severity === "all" || a.severity === severity);
  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Alerts"
        subtitle={`${unreadCount} unread · ${alerts.length} total`}
      />

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap mb-5">
        {SEVERITY_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/alerts?severity=${f.value}`}
            className={`px-3 py-1 rounded-[var(--radius-pill)] text-xs font-semibold border transition-colors ${
              severity === f.value
                ? "bg-gold/15 text-gold border-gold/30"
                : "bg-surface-overlay text-content-secondary border-surface-border hover:border-surface-border-hover hover:text-content-primary"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Alert list */}
      <div className="rounded-[var(--radius-card)] border border-surface-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-content-muted">
            No alerts match the current filter.
          </div>
        ) : (
          <ul>
            {filtered.map((alert) => {
              const severityStyle = SEVERITY_STYLES[alert.severity];
              return (
                <li key={alert.id}>
                  <Link
                    href={`/alerts/${alert.id}`}
                    className={`flex items-start gap-3 px-4 py-4 border-b border-surface-border last:border-0 hover:bg-surface-overlay transition-colors group ${alert.is_read ? "opacity-60" : ""}`}
                  >
                    {/* Unread dot */}
                    <div className="shrink-0 pt-1.5">
                      <span className={`block w-1.5 h-1.5 rounded-full ${alert.is_read ? "bg-surface-border" : severityStyle.dot}`} />
                    </div>

                    {/* Type icon */}
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center">
                      {TYPE_ICON[alert.type]}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-content-primary group-hover:text-gold transition-colors leading-snug mb-1">
                        {alert.message}
                      </p>
                      <p className="text-xs text-content-muted">
                        {alert.project_name ?? alert.project_id}
                      </p>
                    </div>

                    {/* Meta */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <span className={`text-[10px] font-semibold border rounded-[var(--radius-badge)] px-1.5 py-0.5 uppercase tracking-wide ${severityStyle.badge}`}>
                        {alert.severity}
                      </span>
                      <span className="text-[11px] text-content-muted">{relativeTime(alert.created_at)}</span>
                    </div>

                    <ArrowRight size={14} className="shrink-0 text-content-muted opacity-0 group-hover:opacity-100 transition-opacity self-center ml-1" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
