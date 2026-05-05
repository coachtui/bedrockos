import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Wrench, AlertTriangle, Gauge, ArrowUpRight,
  X, ArrowLeft, Truck, Building2,
} from "lucide-react";
import { fetchOrgAlertById } from "@/lib/supabase/alerts";
import { fetchOrgIssueById } from "@/lib/supabase/issues";
import { fetchOrgAssetById } from "@/lib/supabase/assets";
import { fetchOrgProjects } from "@/lib/supabase/projects";
import { getSourceConfig } from "@/lib/modules/source-config";
import { FixEscalateButton } from "@/components/modules/fix/FixEscalateButton";

export const metadata = { title: "Fix" };
const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

// ── module features ───────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon:  <AlertTriangle size={16} className="text-teal" />,
    title: "AI Diagnostics",
    desc:  "Fault code interpretation powered by AI — prioritized by impact and urgency.",
  },
  {
    icon:  <Gauge size={16} className="text-teal" />,
    title: "Fleet Priority",
    desc:  "Fleet-wide health ranking so you know which assets need attention first.",
  },
  {
    icon:  <Wrench size={16} className="text-teal" />,
    title: "Service History",
    desc:  "Centralized service log across all equipment — searchable, shareable, auditable.",
  },
];

// ── page ──────────────────────────────────────────────────────────────────────

type SearchParams = Promise<{ issueId?: string; assetId?: string; alertId?: string; source?: string; role?: string }>;

export default async function FixPage({ searchParams }: { searchParams: SearchParams }) {
  const params  = await searchParams;
  const issueId = typeof params.issueId === "string" ? params.issueId : null;
  const assetId = typeof params.assetId === "string" ? params.assetId : null;
  const alertId = typeof params.alertId === "string" ? params.alertId : null;
  const source  = typeof params.source  === "string" ? params.source  : null;
  const role    = typeof params.role    === "string" ? params.role    : null;

  const issue = issueId ? await fetchOrgIssueById(ORG_ID, issueId) : null;
  const asset = assetId ? await fetchOrgAssetById(ORG_ID, assetId) : null;
  const alert = alertId ? await fetchOrgAlertById(ORG_ID, alertId) : null;

  // Derive project from issue → asset fallback
  const projectId = issue?.project_id ?? asset?.project_id ?? null;
  const projects  = projectId ? await fetchOrgProjects(ORG_ID) : [];
  const project   = projectId ? projects.find((p) => p.id === projectId) ?? null : null;

  // Show banner whenever issue or asset context is present
  const hasContext = !!(issue || asset);

  // Source config from shared registry
  const sourceConfig = getSourceConfig(source);

  // Return link resolution
  let returnHref:  string | null = null;
  let returnLabel: string | null = null;

  if (source === "issue-detail") {
    returnHref  = issue ? `/issues/${issue.id}` : "/issues";
    returnLabel = issue ? "Back to Issue" : "Back to Issues";
  } else if (source === "project-cc") {
    returnHref  = project ? `/projects/${project.id}` : "/projects";
    returnLabel = project ? `Back to ${project.name}` : "Back to Projects";
  } else if (source === "alert-detail") {
    returnHref  = alert ? `/alerts/${alert.id}` : "/alerts";
    returnLabel = "Back to Alert";
  }

  // Context origin chips — what entities are present in this session
  const contextChips = [
    issue   && { label: "Issue"   },
    asset   && { label: "Asset"   },
    project && { label: "Project" },
  ].filter(Boolean) as { label: string }[];

  return (
    <PageContainer>

      {/* ── Context Banner ─────────────────────────────────────────────── */}
      {hasContext && (
        <div className="mb-6 rounded-[var(--radius-card)] border border-teal/30 bg-teal/5 overflow-hidden">

          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal/15 border border-teal/25 flex items-center justify-center shrink-0 mt-0.5">
                <Wrench size={15} className="text-teal" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-teal mb-0.5">
                  Diagnostic context loaded
                </p>
                <p className="text-sm text-content-secondary">
                  {sourceConfig?.subtitle ?? "Opened with diagnostic context"}
                </p>
                {/* Context origin chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {sourceConfig && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal border border-teal/25 bg-teal/10 rounded-[var(--radius-badge)] px-1.5 py-0.5">
                      {sourceConfig.label}
                    </span>
                  )}
                  {contextChips.map(({ label }) => (
                    <span
                      key={label}
                      className="text-[10px] font-semibold uppercase tracking-widest text-content-secondary border border-surface-border bg-surface-overlay rounded-[var(--radius-badge)] px-1.5 py-0.5"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Link
              href="/modules/fix"
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-content-muted hover:text-content-primary hover:bg-surface-overlay transition-colors"
              aria-label="Clear context"
            >
              <X size={13} />
            </Link>
          </div>

          {/* Context detail rows */}
          <div className="border-t border-teal/15 px-5 py-3.5 space-y-2.5">
            {issue && (
              <div className="flex items-center gap-3">
                <AlertTriangle size={13} className="text-content-muted shrink-0" />
                <span className="text-xs text-content-muted w-14 shrink-0">Issue</span>
                <span className="text-sm font-medium text-content-primary flex-1 min-w-0 truncate">
                  {issue.title}
                </span>
                <StatusBadge status={issue.severity} />
              </div>
            )}

            {/* Asset row — show resolved asset OR graceful "no asset" note when issue exists */}
            {asset ? (
              <div className="flex items-center gap-3">
                <Truck size={13} className="text-content-muted shrink-0" />
                <span className="text-xs text-content-muted w-14 shrink-0">Asset</span>
                <span className="text-sm font-medium text-content-primary flex-1 min-w-0 truncate">
                  {asset.name}
                  <span className="text-content-muted font-normal"> · {asset.type}</span>
                </span>
                <StatusBadge status={asset.status} />
              </div>
            ) : issue ? (
              <div className="flex items-center gap-3">
                <Truck size={13} className="text-content-muted shrink-0" />
                <span className="text-xs text-content-muted w-14 shrink-0">Asset</span>
                <span className="text-xs text-content-muted italic">No asset linked to this issue</span>
              </div>
            ) : null}

            {project && (
              <div className="flex items-center gap-3">
                <Building2 size={13} className="text-content-muted shrink-0" />
                <span className="text-xs text-content-muted w-14 shrink-0">Project</span>
                <span className="text-sm text-content-secondary flex-1 min-w-0 truncate">
                  {project.name}
                </span>
              </div>
            )}
          </div>

          {/* Field escalation — shown for superintendent/foreman when asset is in context */}
          {asset && (role === "superintendent" || role === "foreman") && (
            <div className="px-5 pb-5 border-t border-teal/20 pt-4 mt-2">
              <p className="text-xs text-content-muted mb-3">
                Could not resolve in the field?
              </p>
              <FixEscalateButton
                assetId={asset.id}
                assetName={asset.name}
                projectId={asset.project_id}
              />
            </div>
          )}

          {/* Footer — return + clear */}
          <div className="border-t border-teal/15 px-5 py-3 flex items-center gap-3">
            {returnHref && returnLabel && (
              <Link
                href={returnHref}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:opacity-80 transition-opacity"
              >
                <ArrowLeft size={12} />
                {returnLabel}
              </Link>
            )}
            {returnHref && <span className="text-surface-border">·</span>}
            <Link
              href="/modules/fix"
              className="text-xs text-content-muted hover:text-content-primary transition-colors"
            >
              Clear context
            </Link>
          </div>
        </div>
      )}

      {/* ── Module Hero ────────────────────────────────────────────────── */}
      <div className="rounded-[var(--radius-card)] border border-teal/30 bg-gradient-to-br from-surface-raised to-surface-overlay p-8 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-teal" />
          <span className="text-xs font-bold uppercase tracking-widest text-teal">Module · Diagnostic AI</span>
        </div>
        <h1 className="text-2xl font-bold text-content-primary">Fix</h1>
        <p className="text-content-secondary mt-2 max-w-md leading-relaxed">
          AI-powered equipment diagnostic intelligence. Proactive fault detection, fleet health scoring, and service coordination — before breakdowns happen.
        </p>
        <Link
          href="#"
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-lg bg-teal hover:opacity-90 text-content-inverse text-sm font-semibold transition-opacity"
        >
          Launch Fix <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* ── Feature Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <Card key={f.title} variant="default">
            <div className="w-8 h-8 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center mb-3">
              {f.icon}
            </div>
            <p className="font-semibold text-content-primary text-sm">{f.title}</p>
            <p className="text-xs text-content-secondary mt-1.5 leading-relaxed">{f.desc}</p>
          </Card>
        ))}
      </div>

    </PageContainer>
  );
}
