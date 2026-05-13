import React from "react";
import Link from "next/link";
import { ArrowLeft, FileSearch } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FixLaunchButton } from "@/components/modules/fix/FixLaunchButton";
import { fetchOrgIssueById } from "@/lib/supabase/issues";
import { fetchMxWorkOrderById } from "@/lib/supabase/mx-work-orders";
import { fetchCxTaskById } from "@/lib/supabase/cx-tasks";
import { getIssuePhotoSignedUrl } from "@/lib/actions/issues";
import { IssueStatusButtons } from "@/components/shell/IssueStatusButtons";
import { notFound } from "next/navigation";
import type { ModuleId } from "@/types/org";
import { getEnvOrgId } from "@/lib/config/org";

const ORG_ID = getEnvOrgId();

const MODULE_LABEL: Record<ModuleId, string> = {
  fix:      "FX",
  cru:      "CX",
  inspect:  "IX",
  datum:    "DX",
  ops:      "OX",
  mx:       "MX",
  schedule: "Schedule",
  safety:   "SX",
};

const MODULE_COLOR: Record<ModuleId, string> = {
  fix:      "text-teal            border-teal/30            bg-teal/10",
  cru:      "text-gold            border-gold/30            bg-gold/10",
  inspect:  "text-blue-brand      border-blue-brand/30      bg-blue-brand/10",
  datum:    "text-teal            border-teal/30            bg-teal/10",
  ops:      "text-gold            border-gold/30            bg-gold/10",
  mx:       "text-teal            border-teal/30            bg-teal/10",
  schedule: "text-teal            border-teal/30            bg-teal/10",
  safety:   "text-status-critical border-status-critical/30 bg-status-critical/10",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

type Params = Promise<{ issueId: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { issueId } = await params;
  const issue = await fetchOrgIssueById(ORG_ID, issueId);
  return { title: issue ? issue.title : "Issue Not Found" };
}

export default async function IssueDetailPage({ params }: { params: Params }) {
  const { issueId } = await params;
  const issue = await fetchOrgIssueById(ORG_ID, issueId);

  if (!issue) notFound();

  const [linkedWo, linkedTask, photoUrls] = await Promise.all([
    issue.related_work_order_id ? fetchMxWorkOrderById(issue.related_work_order_id) : Promise.resolve(null),
    issue.related_task_id       ? fetchCxTaskById(issue.related_task_id)            : Promise.resolve(null),
    Promise.all((issue.photo_paths ?? []).map(async (path) => {
      const result = await getIssuePhotoSignedUrl(path);
      return { path, url: result.url ?? null };
    })),
  ]);

  const isFromInspect = issue.module === "inspect";
  const isFromFix     = issue.module === "fix";

  return (
    <PageContainer>
      {/* Breadcrumb / back */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/issues"
          className="flex items-center gap-1.5 text-sm text-content-muted hover:text-content-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Issues
        </Link>
        <span className="text-content-muted">/</span>
        <span className="text-sm text-content-secondary truncate">{issue.title}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`text-xs font-semibold border rounded-[var(--radius-badge)] px-1.5 py-0.5 uppercase tracking-wide ${MODULE_COLOR[issue.module]}`}>
            {MODULE_LABEL[issue.module]}
          </span>
          <StatusBadge status={issue.severity} size="md" />
          <StatusBadge status={issue.status}   size="md" />
        </div>
        <h1 className="text-xl font-bold text-content-primary leading-snug">{issue.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">

          {/* Description */}
          {issue.description && (
            <Card variant="default">
              <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted mb-3">Summary</p>
              <p className="text-sm text-content-secondary leading-relaxed">{issue.description}</p>
            </Card>
          )}

          {/* Photos */}
          {photoUrls.length > 0 && (
            <Card variant="default">
              <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted mb-3">Photos</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photoUrls.map(({ path, url }) =>
                  url ? (
                    <a
                      key={path}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square overflow-hidden rounded-lg border border-surface-border hover:border-blue-brand/40 transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Inspection photo" className="w-full h-full object-cover" />
                    </a>
                  ) : (
                    <div key={path} className="aspect-square rounded-lg border border-surface-border bg-surface-overlay text-[10px] text-content-muted flex items-center justify-center">
                      Unavailable
                    </div>
                  )
                )}
              </div>
            </Card>
          )}

          {/* Status controls */}
          <Card variant="default">
            <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted mb-3">Status</p>
            <IssueStatusButtons issueId={issue.id} status={issue.status} />
          </Card>

          {/* Action bar */}
          <div className="flex flex-wrap gap-2">
            {(isFromFix || issue.asset_id) && (
              <FixLaunchButton
                context={{
                  source:    "issue-detail",
                  issueId:   issue.id,
                  assetId:   issue.asset_id,
                  projectId: issue.project_id,
                  returnTo:  `/issues/${issue.id}`,
                }}
                label="Open in Fix"
              />
            )}
            {isFromInspect && issue.inspection_id ? (
              <Link
                href={`/modules/inspect`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-brand/30 bg-blue-brand/10 text-blue-brand text-sm font-semibold hover:bg-blue-brand/15 transition-colors"
              >
                <FileSearch size={14} />
                View Source Inspection
              </Link>
            ) : isFromInspect ? (
              <button
                disabled
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-border bg-surface-overlay text-content-muted text-sm font-semibold cursor-not-allowed opacity-50"
              >
                <FileSearch size={14} />
                View Source Inspection
              </button>
            ) : null}
            <Link
              href="/issues"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-border bg-surface-overlay text-content-secondary hover:text-content-primary hover:border-surface-border-hover text-sm font-semibold transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Issues
            </Link>
          </div>
        </div>

        {/* Context sidebar */}
        <div className="space-y-4">
          <Card variant="default">
            <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted mb-3">Context</p>
            <div className="space-y-0">
              {([
                { label: "Project",     value: issue.project_name ?? issue.project_id },
                { label: "Asset",       value: issue.asset_name ?? null          },
                { label: "Reported by", value: issue.assignee_name ?? "Unassigned" },
                { label: "Reported",    value: formatDate(issue.created_at)       },
                { label: "Source",      value: MODULE_LABEL[issue.module]          },
                { label: "Inspection",  value: issue.inspection_id ?? null         },
                {
                  label: "Linked Task",
                  value: linkedTask ? linkedTask.name : null,
                },
                {
                  label: "Linked WO",
                  value: linkedWo
                    ? (
                      <Link
                        href={`/modules/mx/work-orders/${linkedWo.id}`}
                        className="text-gold hover:text-gold-hover transition-colors"
                      >
                        {linkedWo.woNumber}
                      </Link>
                    )
                    : null,
                },
              ] as { label: string; value: React.ReactNode | null }[])
                .filter((row) => row.value !== null).map(({ label, value }) => (
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
