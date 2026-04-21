import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MOCK_ISSUES } from "@/lib/mock/issues";
import type { IssueSeverity } from "@/types/domain";
import type { ModuleId } from "@/types/org";

export const metadata = { title: "Issues" };

const MODULE_LABEL: Record<ModuleId, string> = {
  fix:     "Fix",
  cru:     "CRU",
  inspect: "Inspect",
  datum:   "Datum",
  ops:     "OPS",
  mx:      "MX",
};

const MODULE_COLOR: Record<ModuleId, string> = {
  fix:     "text-teal       border-teal/30       bg-teal/10",
  cru:     "text-gold       border-gold/30       bg-gold/10",
  inspect: "text-blue-brand border-blue-brand/30 bg-blue-brand/10",
  datum:   "text-teal       border-teal/30       bg-teal/10",
  ops:     "text-gold       border-gold/30       bg-gold/10",
  mx:      "text-teal       border-teal/30       bg-teal/10",
};

const SEVERITY_BAR: Record<IssueSeverity, string> = {
  critical: "bg-status-critical",
  high:     "bg-status-warning",
  medium:   "bg-blue-brand",
  low:      "bg-surface-border",
};

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

type SearchParams = Promise<{ severity?: string; source?: string }>;

export default async function IssuesPage({ searchParams }: { searchParams: SearchParams }) {
  const params   = await searchParams;
  const severity = typeof params.severity === "string" ? params.severity : "all";
  const source   = typeof params.source   === "string" ? params.source   : "all";

  const SEVERITY_FILTERS = ["all", "critical", "high", "medium", "low"];
  const SOURCE_FILTERS   = [
    { label: "All",     value: "all"     },
    { label: "MX",      value: "mx"      },
    { label: "OPS",     value: "ops"     },
    { label: "Fix",     value: "fix"     },
    { label: "Inspect", value: "inspect" },
  ];

  const filtered = MOCK_ISSUES
    .filter((i) => severity === "all" || i.severity === severity)
    .filter((i) => source   === "all" || i.module   === source);

  const openCount     = MOCK_ISSUES.filter((i) => i.status !== "resolved").length;
  const criticalCount = MOCK_ISSUES.filter((i) => i.severity === "critical").length;

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Issues"
        subtitle={`${openCount} open · ${criticalCount} critical`}
      />

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        {/* Severity pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {SEVERITY_FILTERS.map((s) => (
            <Link
              key={s}
              href={`/issues?severity=${s}&source=${source}`}
              className={`px-3 py-1 rounded-[var(--radius-pill)] text-xs font-semibold border transition-colors capitalize ${
                severity === s
                  ? "bg-gold/15 text-gold border-gold/30"
                  : "bg-surface-overlay text-content-secondary border-surface-border hover:border-surface-border-hover hover:text-content-primary"
              }`}
            >
              {s === "all" ? "All Severity" : s}
            </Link>
          ))}
        </div>

        <div className="h-4 w-px bg-surface-border hidden sm:block" />

        {/* Source pills */}
        <div className="flex items-center gap-1.5">
          {SOURCE_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/issues?severity=${severity}&source=${f.value}`}
              className={`px-3 py-1 rounded-[var(--radius-pill)] text-xs font-semibold border transition-colors ${
                source === f.value
                  ? "bg-gold/15 text-gold border-gold/30"
                  : "bg-surface-overlay text-content-secondary border-surface-border hover:border-surface-border-hover hover:text-content-primary"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Issues list */}
      <div className="rounded-[var(--radius-card)] border border-surface-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-content-muted">
            No issues match the current filters.
          </div>
        ) : (
          <ul>
            {filtered.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={`/issues/${issue.id}`}
                  className="flex items-start gap-3 px-4 py-3.5 border-b border-surface-border last:border-0 hover:bg-surface-overlay transition-colors group"
                >
                  {/* Severity bar */}
                  <div className={`shrink-0 w-0.5 self-stretch rounded-full mt-0.5 ${SEVERITY_BAR[issue.severity]}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-content-primary group-hover:text-gold transition-colors">
                        {issue.title}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-content-muted">
                      {issue.asset_name && <span>{issue.asset_name}</span>}
                      {issue.asset_name && <span>·</span>}
                      <span>{issue.project_name ?? issue.project_id}</span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold border rounded-[var(--radius-badge)] px-1.5 py-0.5 uppercase tracking-wide ${MODULE_COLOR[issue.module]}`}>
                        {MODULE_LABEL[issue.module]}
                      </span>
                      <StatusBadge status={issue.severity} size="sm" />
                      <StatusBadge status={issue.status}   size="sm" />
                    </div>
                    <span className="text-[11px] text-content-muted">{relativeTime(issue.created_at)}</span>
                  </div>

                  <ArrowRight size={14} className="shrink-0 text-content-muted opacity-0 group-hover:opacity-100 transition-opacity self-center ml-1" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
