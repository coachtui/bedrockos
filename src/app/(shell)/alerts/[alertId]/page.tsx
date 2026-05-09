import React from "react";
import Link from "next/link";
import { ArrowLeft, Search, ExternalLink } from "lucide-react";
import { FixLaunchButton } from "@/components/modules/fix/FixLaunchButton";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { fetchOrgAlertById } from "@/lib/supabase/alerts";
import { fetchOrgIssueById } from "@/lib/supabase/issues";
import { AlertReadToggle } from "@/components/shell/AlertReadToggle";
import { notFound } from "next/navigation";
import type { AlertType, AlertSeverity } from "@/types/domain";
import { getEnvOrgId } from "@/lib/config/org";

const ORG_ID = getEnvOrgId();

const TYPE_LABEL: Record<AlertType, string> = {
  safety:     "Safety",
  schedule:   "Schedule",
  equipment:  "Equipment",
  budget:     "Budget",
  inspection: "Inspection",
};

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  critical: "text-status-critical border-status-critical/25 bg-status-critical/10",
  warning:  "text-status-warning  border-status-warning/25  bg-status-warning/10",
  info:     "text-blue-brand       border-blue-brand/25       bg-blue-brand/10",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

type Params = Promise<{ alertId: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { alertId } = await params;
  const alert = await fetchOrgAlertById(ORG_ID, alertId);
  return { title: alert ? alert.message : "Alert Not Found" };
}

export default async function AlertDetailPage({ params }: { params: Params }) {
  const { alertId } = await params;
  const alert = await fetchOrgAlertById(ORG_ID, alertId);

  if (!alert) notFound();

  const relatedIssue = alert.related_issue_id
    ? await fetchOrgIssueById(ORG_ID, alert.related_issue_id)
    : null;

  return (
    <PageContainer>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/alerts"
          className="flex items-center gap-1.5 text-sm text-content-muted hover:text-content-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Alerts
        </Link>
        <span className="text-content-muted">/</span>
        <span className="text-sm text-content-secondary truncate">{TYPE_LABEL[alert.type]} Alert</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`text-xs font-semibold border rounded-[var(--radius-badge)] px-1.5 py-0.5 uppercase tracking-wide ${SEVERITY_BADGE[alert.severity]}`}>
            {alert.severity}
          </span>
          <span className="text-xs font-semibold border rounded-[var(--radius-badge)] px-1.5 py-0.5 uppercase tracking-wide text-content-secondary border-surface-border bg-surface-overlay">
            {TYPE_LABEL[alert.type]}
          </span>
          {!alert.is_read && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold border border-gold/30 bg-gold/10 rounded-[var(--radius-badge)] px-1.5 py-0.5">
              Unread
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold text-content-primary leading-snug">{alert.message}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">

          {/* Description */}
          {alert.description && (
            <Card variant="default">
              <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted mb-3">Details</p>
              <p className="text-sm text-content-secondary leading-relaxed">{alert.description}</p>
            </Card>
          )}

          {/* Action bar */}
          <div className="flex flex-wrap gap-2">
            <AlertReadToggle alertId={alert.id} isRead={alert.is_read} />
            <Link
              href="/issues"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse text-sm font-semibold transition-colors"
            >
              <Search size={14} />
              Investigate
            </Link>

            {relatedIssue?.asset_id && (
              <FixLaunchButton
                context={{
                  source:    "alert-detail",
                  issueId:   relatedIssue.id,
                  assetId:   relatedIssue.asset_id,
                  alertId:   alert.id,
                  projectId: alert.project_id,
                  returnTo:  `/alerts/${alert.id}`,
                }}
                label="Open in Fix"
              />
            )}

            {alert.related_issue_id ? (
              <Link
                href={`/issues/${alert.related_issue_id}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-border bg-surface-overlay hover:border-surface-border-hover text-content-secondary hover:text-content-primary text-sm font-semibold transition-colors"
              >
                <ExternalLink size={14} />
                Open Related Issue
              </Link>
            ) : null}

            <Link
              href="/alerts"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-border bg-surface-overlay text-content-secondary hover:text-content-primary hover:border-surface-border-hover text-sm font-semibold transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Alerts
            </Link>
          </div>
        </div>

        {/* Context sidebar */}
        <div>
          <Card variant="default">
            <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted mb-3">Context</p>
            <div className="space-y-0">
              {[
                { label: "Project",       value: alert.project_name ?? alert.project_id },
                { label: "Type",          value: TYPE_LABEL[alert.type]                 },
                { label: "Priority",      value: alert.severity                          },
                { label: "Created",       value: formatDate(alert.created_at)            },
                { label: "Status",        value: alert.is_read ? "Read" : "Unread"       },
                { label: "Related Issue", value: alert.related_issue_id ?? null          },
              ].filter((row) => row.value !== null).map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-3 py-2.5 border-b border-surface-border last:border-0">
                  <span className="text-xs text-content-muted shrink-0">{label}</span>
                  <span className="text-xs font-medium text-content-secondary text-right">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
