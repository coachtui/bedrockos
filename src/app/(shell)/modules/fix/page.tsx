import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Wrench, AlertTriangle, X, ArrowLeft, Truck, Building2,
} from "lucide-react";
import { fetchOrgAlertById } from "@/lib/supabase/alerts";
import { fetchOrgIssueById } from "@/lib/supabase/issues";
import { fetchOrgAssetById } from "@/lib/supabase/assets";
import { fetchOrgProjects } from "@/lib/supabase/projects";
import { getSourceConfig } from "@/lib/modules/source-config";
import { FixEscalateButton } from "@/components/modules/fix/FixEscalateButton";
import { FixChat } from "@/components/modules/fix/FixChat";
import { getEnvOrgId } from "@/lib/config/org";

export const metadata = { title: "Fix" };
const ORG_ID = getEnvOrgId();

type SearchParams = Promise<{
  issueId?: string;
  assetId?: string;
  alertId?: string;
  source?:  string;
  role?:    string;
}>;

export default async function FixPage({ searchParams }: { searchParams: SearchParams }) {
  const params  = await searchParams;
  const issueId = typeof params.issueId === "string" ? params.issueId : null;
  const assetId = typeof params.assetId === "string" ? params.assetId : null;
  const alertId = typeof params.alertId === "string" ? params.alertId : null;
  const source  = typeof params.source  === "string" ? params.source  : null;
  const role    = typeof params.role    === "string" ? params.role    : null;

  const issue = issueId ? await fetchOrgIssueById(ORG_ID, issueId) : null;
  const asset = assetId ? await fetchOrgAssetById(ORG_ID, assetId) : null;
  const _alert = alertId ? await fetchOrgAlertById(ORG_ID, alertId) : null;
  void _alert;

  const projectId = issue?.project_id ?? asset?.project_id ?? null;
  const projects  = projectId ? await fetchOrgProjects(ORG_ID) : [];
  const project   = projectId ? projects.find((p) => p.id === projectId) ?? null : null;

  const hasContext   = !!(issue || asset);
  const sourceConfig = getSourceConfig(source);

  let returnHref:  string | null = null;
  let returnLabel: string | null = null;
  if (source === "issue-detail") {
    returnHref  = issue ? `/issues/${issue.id}` : "/issues";
    returnLabel = issue ? "Back to Issue" : "Back to Issues";
  } else if (source === "project-cc") {
    returnHref  = project ? `/projects/${project.id}` : "/projects";
    returnLabel = project ? `Back to ${project.name}` : "Back to Projects";
  } else if (source === "alert-detail") {
    returnHref  = "/alerts";
    returnLabel = "Back to Alert";
  }

  const contextChips = [
    issue   && { label: "Issue"   },
    asset   && { label: "Asset"   },
    project && { label: "Project" },
  ].filter(Boolean) as { label: string }[];

  const contextHint = [
    asset   && `Asset: ${asset.name} (${asset.type})`,
    issue   && `Issue: ${issue.title}`,
    project && `Project: ${project.name}`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {hasContext && (
        <div className="shrink-0 border-b border-teal/20 bg-teal/5">
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal/15 border border-teal/25 flex items-center justify-center shrink-0 mt-0.5">
                <Wrench size={14} className="text-teal" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-teal mb-0.5">
                  Diagnostic context
                </p>
                <p className="text-sm text-content-secondary">
                  {sourceConfig?.subtitle ?? "Opened with diagnostic context"}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {sourceConfig && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal border border-teal/25 bg-teal/10 rounded-[var(--radius-badge)] px-1.5 py-0.5">
                      {sourceConfig.label}
                    </span>
                  )}
                  {contextChips.map(({ label }) => (
                    <span key={label} className="text-[10px] font-semibold uppercase tracking-widest text-content-secondary border border-surface-border bg-surface-overlay rounded-[var(--radius-badge)] px-1.5 py-0.5">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Link href="/modules/fix" className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-content-muted hover:text-content-primary hover:bg-surface-overlay transition-colors" aria-label="Clear context">
              <X size={13} />
            </Link>
          </div>

          <div className="border-t border-teal/15 px-5 py-3 space-y-2">
            {issue && (
              <div className="flex items-center gap-3">
                <AlertTriangle size={12} className="text-content-muted shrink-0" />
                <span className="text-xs text-content-muted w-14 shrink-0">Issue</span>
                <span className="text-sm font-medium text-content-primary flex-1 min-w-0 truncate">{issue.title}</span>
                <StatusBadge status={issue.severity} />
              </div>
            )}
            {asset ? (
              <div className="flex items-center gap-3">
                <Truck size={12} className="text-content-muted shrink-0" />
                <span className="text-xs text-content-muted w-14 shrink-0">Asset</span>
                <span className="text-sm font-medium text-content-primary flex-1 min-w-0 truncate">
                  {asset.name}<span className="text-content-muted font-normal"> · {asset.type}</span>
                </span>
                <StatusBadge status={asset.status} />
              </div>
            ) : issue ? (
              <div className="flex items-center gap-3">
                <Truck size={12} className="text-content-muted shrink-0" />
                <span className="text-xs text-content-muted w-14 shrink-0">Asset</span>
                <span className="text-xs text-content-muted italic">No asset linked</span>
              </div>
            ) : null}
            {project && (
              <div className="flex items-center gap-3">
                <Building2 size={12} className="text-content-muted shrink-0" />
                <span className="text-xs text-content-muted w-14 shrink-0">Project</span>
                <span className="text-sm text-content-secondary flex-1 min-w-0 truncate">{project.name}</span>
              </div>
            )}
          </div>

          <div className="border-t border-teal/15 px-5 py-2.5 flex items-center gap-3">
            {returnHref && returnLabel && (
              <Link href={returnHref} className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:opacity-80 transition-opacity">
                <ArrowLeft size={11} />
                {returnLabel}
              </Link>
            )}
            {returnHref && <span className="text-surface-border">·</span>}
            <Link href="/modules/fix" className="text-xs text-content-muted hover:text-content-primary transition-colors">
              Clear context
            </Link>
            {asset && (role === "superintendent" || role === "foreman") && (
              <>
                <span className="text-surface-border">·</span>
                <FixEscalateButton assetId={asset.id} assetName={asset.name} projectId={asset.project_id} />
              </>
            )}
          </div>
        </div>
      )}

      <FixChat
        initialContextHint={contextHint || undefined}
        initialAssetType={asset?.type ?? undefined}
        initialAssetMakeModel={asset?.name ?? undefined}
      />
    </div>
  );
}
