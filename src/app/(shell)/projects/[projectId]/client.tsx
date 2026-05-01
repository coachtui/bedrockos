"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, MapPin, User, Calendar,
  Wrench, Users, ClipboardCheck, ChevronRight,
  AlertCircle, Bell, Truck, DollarSign, Pencil,
} from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ActivityFeedItem } from "@/components/ui/ActivityFeedItem";
import { ProjectInspectorPanel } from "@/components/shell/ProjectInspectorPanel";
import { MOCK_ASSETS } from "@/lib/mock/assets";
import { MOCK_CREWS } from "@/lib/mock/crews";
import { useOrg } from "@/providers/OrgProvider";
import { getRoleGroup } from "@/lib/utils/roles";
import { buildFixUrl } from "@/lib/modules/fix/launch";
import { FixLaunchButton } from "@/components/modules/fix/FixLaunchButton";
import type { ActivityEvent, Issue, Alert } from "@/types/domain";
import { ScheduleTab } from "@/components/schedule/ScheduleTab";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatCurrency(n: number): string {
  if (n >= 999_500) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)   return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function getActivityHref(event: ActivityEvent): string | undefined {
  if (event.target_type === "issue"   && event.target_id) return `/issues/${event.target_id}`;
  if (event.target_type === "alert"   && event.target_id) return `/alerts/${event.target_id}`;
  if (event.target_type === "project" && event.target_id) return `/projects/${event.target_id}`;
  return undefined;
}

// ── severity/alert styling ────────────────────────────────────────────────────

const ISSUE_SEVERITY_DOT: Record<string, string> = {
  critical: "bg-status-critical",
  high:     "bg-status-warning",
  medium:   "bg-blue-brand",
  low:      "bg-content-muted",
};

const SEVERITY_PILL: Record<string, string> = {
  critical: "text-status-critical bg-status-critical/10 border-status-critical/20",
  high:     "text-status-warning  bg-status-warning/10  border-status-warning/20",
  medium:   "text-blue-brand      bg-blue-brand/10       border-blue-brand/20",
  low:      "text-content-secondary bg-surface-border border-surface-border-hover",
};

const ALERT_SEVERITY_DOT: Record<string, string> = {
  critical: "bg-status-critical",
  warning:  "bg-status-warning",
  info:     "bg-blue-brand",
};

// ── module quick actions ──────────────────────────────────────────────────────

const MODULE_ACTIONS = [
  {
    key:         "cru",
    label:       "CRU",
    description: "Crew operations",
    href:        "/modules/cru",
    icon:        <Users size={15} className="text-gold" />,
    hover:       "hover:border-gold/40 hover:bg-gold/5",
  },
  {
    key:         "fix",
    label:       "Fix",
    description: "Equipment diagnostics",
    href:        "/modules/fix",
    icon:        <Wrench size={15} className="text-teal" />,
    hover:       "hover:border-teal/40 hover:bg-teal/5",
  },
  {
    key:         "inspect",
    label:       "Inspect",
    description: "Field inspections",
    href:        "/modules/inspect",
    icon:        <ClipboardCheck size={15} className="text-blue-brand" />,
    hover:       "hover:border-blue-brand/40 hover:bg-blue-brand/5",
  },
  {
    key:         "datum",
    label:       "Datum",
    description: "Geospatial layout",
    href:        "/modules/datum",
    icon:        <MapPin size={15} className="text-teal" />,
    hover:       "hover:border-teal/40 hover:bg-teal/5",
  },
];

// ── role CTA bar ──────────────────────────────────────────────────────────────

function RoleCTABar({ projectId }: { projectId: string }) {
  const { role } = useOrg();
  const roleGroup = getRoleGroup(role);

  if (roleGroup === "maintenance") {
    return (
      <div className="mb-4 flex items-center gap-3">
        <FixLaunchButton
          context={{
            source:    "project-command-center",
            projectId,
            returnTo:  `/projects/${projectId}`,
          }}
          label="Run Fix"
          variant="outline"
        />
      </div>
    );
  }

  if (roleGroup === "field") {
    return (
      <div className="mb-4 flex items-center gap-3">
        <button
          className="inline-flex items-center gap-2 text-sm font-semibold text-gold border border-gold/30 bg-gold/5 px-4 py-2 rounded-lg cursor-not-allowed opacity-60"
          disabled
        >
          <Users size={14} />
          Assign Crew
        </button>
        <span className="text-xs text-content-muted">Crew assignment workflow coming next</span>
      </div>
    );
  }

  if (role === "project_engineer") {
    return (
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/modules/cru"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gold border border-gold/30 bg-gold/5 hover:bg-gold/15 px-4 py-2 rounded-lg transition-colors"
        >
          <Users size={14} />
          CRU
        </Link>
      </div>
    );
  }

  return null;
}

// ── issues section ────────────────────────────────────────────────────────────

function IssuesSection({ issues, label, subtitle, projectId }: {
  issues: Issue[];
  label: string;
  subtitle: string;
  projectId: string;
}) {
  const topIssues = issues.slice(0, 5);

  return (
    <Card variant="default" className="!p-0">
      <div className="p-5 pb-3">
        <SectionHeader
          title={label}
          subtitle={subtitle}
          action={
            <Link href="/issues" className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          }
        />
        {issues.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(["critical", "high", "medium", "low"] as const).map((sev) => {
              const count = issues.filter((i) => i.severity === sev).length;
              return count > 0 ? (
                <span
                  key={sev}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-[var(--radius-badge)] uppercase tracking-wide border ${SEVERITY_PILL[sev]}`}
                >
                  {count} {sev}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>

      {topIssues.length === 0 ? (
        <div className="px-5 pb-5 text-sm text-content-muted italic">No open issues on this project.</div>
      ) : (
        <div>
          {topIssues.map((issue) => (
            <div key={issue.id} className="relative group border-t border-surface-border hover:bg-surface-overlay transition-colors">
              <Link href={`/issues/${issue.id}`} className="absolute inset-0" aria-label={issue.title} />
              <div className="relative flex items-center gap-3 px-5 py-3 pointer-events-none">
                <div className={`shrink-0 w-1.5 h-1.5 rounded-full ${ISSUE_SEVERITY_DOT[issue.severity] ?? "bg-content-muted"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content-primary group-hover:text-white transition-colors truncate">
                    {issue.title}
                  </p>
                  {issue.asset_name && (
                    <p className="text-xs text-content-muted mt-0.5 truncate">{issue.asset_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={issue.severity} />
                  <StatusBadge status={issue.status} />
                </div>
              </div>
              {issue.asset_id && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2 z-10 pointer-events-auto">
                  <FixLaunchButton
                    context={{
                      source:    "project-command-center",
                      issueId:   issue.id,
                      assetId:   issue.asset_id,
                      projectId,
                      returnTo:  `/projects/${projectId}`,
                    }}
                    label="Fix →"
                    variant="inline"
                  />
                </div>
              )}
              <ChevronRight
                size={12}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-content-muted group-hover:text-content-secondary transition-colors pointer-events-none"
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── alerts section ────────────────────────────────────────────────────────────

function AlertsSection({ alerts, unreadCount }: { alerts: Alert[]; unreadCount: number }) {
  const topAlerts = alerts.slice(0, 4);

  return (
    <Card variant="default" className="!p-0">
      <div className="p-5 pb-3">
        <SectionHeader
          title="Active Alerts"
          subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          action={
            <Link href="/alerts" className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          }
        />
      </div>

      {topAlerts.length === 0 ? (
        <div className="px-5 pb-5 text-sm text-content-muted italic">No alerts for this project.</div>
      ) : (
        <div>
          {topAlerts.map((alert) => (
            <Link key={alert.id} href={`/alerts/${alert.id}`} className="group block">
              <div className="flex items-start gap-3 px-5 py-3 border-t border-surface-border hover:bg-surface-overlay transition-colors">
                <div className={`shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${ALERT_SEVERITY_DOT[alert.severity] ?? "bg-content-muted"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-content-primary group-hover:text-white transition-colors leading-snug">
                    {alert.message}
                  </p>
                  {!alert.is_read && (
                    <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest text-gold">
                      Unread
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-content-muted tabular-nums">
                  {relativeTime(alert.created_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── activity section ──────────────────────────────────────────────────────────

function ActivitySection({ events }: { events: ActivityEvent[] }) {
  return (
    <Card variant="default" className="!p-0">
      <div className="p-5 pb-2">
        <SectionHeader
          title="Project Activity"
          subtitle="Recent events on this job"
          action={
            <Link href="/activity" className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          }
        />
      </div>

      {events.length === 0 ? (
        <div className="px-5 pb-5 text-sm text-content-muted italic">No activity recorded for this project.</div>
      ) : (
        <div className="px-5 pb-3">
          {events.map((event) => (
            <ActivityFeedItem
              key={event.id}
              event={event}
              href={getActivityHref(event)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

// ── main client component ─────────────────────────────────────────────────────

export function ProjectCommandCenterClient({ projectId }: { projectId: string }) {
  const { role, projects, setCurrentProject, issues, alerts, activity } = useOrg();
  const [activeTab, setActiveTab] = useState<"overview" | "schedule">("overview");
  const [editOpen, setEditOpen] = useState(false);
  const roleGroup = getRoleGroup(role);
  const canEdit = roleGroup === "oversight" || roleGroup === "office";

  const project = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (project) {
      setCurrentProject({ id: project.id, name: project.name, slug: project.slug });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  if (!project) {
    return (
      <PageContainer>
        <p className="text-content-muted py-12 text-center text-sm">Project not found.</p>
      </PageContainer>
    );
  }

  // Base project-scoped data
  const projectIssues   = issues.filter((i) => i.project_id === projectId);
  const projectAlerts   = alerts.filter((a) => a.project_id === projectId);
  const projectActivity = activity.filter((e) => e.project_id === projectId).slice(0, 8);
  const projectAssets   = MOCK_ASSETS.filter((a) => a.project_id === projectId);
  const projectCrews    = MOCK_CREWS.filter((c) => c.project_id === projectId);

  // Role-aware issue filtering/ordering
  let openIssues = projectIssues.filter((i) => i.status !== "resolved");

  if (roleGroup === "maintenance") {
    openIssues = openIssues.filter((i) => !!i.asset_id);
  } else if (role === "project_engineer") {
    openIssues = [
      ...openIssues.filter((i) => i.module === "inspect"),
      ...openIssues.filter((i) => i.module !== "inspect"),
    ];
  }

  // Role-aware alert ordering
  let displayAlerts = [...projectAlerts];
  if (roleGroup === "maintenance") {
    displayAlerts = [
      ...displayAlerts.filter((a) => a.type === "equipment"),
      ...displayAlerts.filter((a) => a.type !== "equipment"),
    ];
  }

  const unreadAlerts = projectAlerts.filter((a) => !a.is_read);
  const hasCritical  = openIssues.some((i) => i.severity === "critical");

  // Role-aware labels
  const issuesLabel    = roleGroup === "maintenance" ? "Equipment Issues" : "Priority Issues";
  const issueSubtitle  = role === "project_engineer"
    ? `${openIssues.length} open · inspection items first`
    : `${openIssues.length} open issue${openIssues.length !== 1 ? "s" : ""}`;

  // Left-column section ordering by role
  const issuesSection   = <IssuesSection key="issues"   issues={openIssues}   label={issuesLabel} subtitle={issueSubtitle} projectId={projectId} />;
  const alertsSection   = <AlertsSection key="alerts"   alerts={displayAlerts} unreadCount={unreadAlerts.length} />;
  const activitySection = <ActivitySection key="activity" events={projectActivity} />;

  let leftSections: React.ReactNode[];
  if (role === "pm") {
    // PM: alerts first for risk visibility
    leftSections = [alertsSection, issuesSection, activitySection];
  } else if (role === "project_engineer") {
    // Engineer: issues (inspect-first) then activity then alerts
    leftSections = [issuesSection, activitySection, alertsSection];
  } else {
    // Default: issues, alerts, activity
    leftSections = [issuesSection, alertsSection, activitySection];
  }

  return (
    <PageContainer maxWidth="wide">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-sm text-content-muted hover:text-content-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Projects
        </Link>
        <span className="text-content-muted">/</span>
        <span className="text-sm text-content-secondary truncate">{project.name}</span>
      </div>

      {/* ── Project Header ─────────────────────────────────────────────────── */}
      <Card variant="default" className="mb-4">
        <div className="flex flex-col md:flex-row md:items-start gap-5">

          <div className="hidden md:block w-0.5 self-stretch rounded-full bg-gold/50 shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge status={project.status} size="md" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-content-muted">
                {project.phase}
              </span>
              {/* Role-aware context label */}
              {roleGroup === "maintenance" && (
                <span className="text-[11px] font-bold uppercase tracking-widest text-teal ml-1">
                  Equipment on This Project
                </span>
              )}
              {role === "project_engineer" && (
                <span className="text-[11px] font-bold uppercase tracking-widest text-blue-brand ml-1">
                  Project Data &amp; Inspections
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-content-primary leading-tight mb-3">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-sm text-content-secondary mb-3 leading-relaxed max-w-xl">
                {project.description}
              </p>
            )}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-content-muted">
              <span className="flex items-center gap-1.5">
                <MapPin size={11} />
                {project.location}
              </span>
              <span className="flex items-center gap-1.5">
                <User size={11} />
                PM: <span className="text-content-secondary font-medium ml-0.5">{project.pm_name}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={11} />
                {formatDate(project.start_date)} – {formatDate(project.end_date)}
              </span>
              {project.award_price != null && (
                <span className="flex items-center gap-1.5">
                  <DollarSign size={11} />
                  Contract:{" "}
                  <span className="text-content-secondary font-medium ml-0.5">
                    {formatCurrency(project.award_price)}
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 md:text-right">
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="mb-4 inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary border border-surface-border hover:border-surface-border-hover rounded-lg px-3 py-1.5 transition-colors"
              >
                <Pencil size={11} />
                Edit
              </button>
            )}
            <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted mb-1.5">Progress</p>
            <p className="text-4xl font-bold text-gold tabular-nums leading-none mb-2.5">
              {project.progress_pct}
              <span className="text-xl text-gold/50">%</span>
            </p>
            <div className="w-32 h-1.5 bg-surface-overlay rounded-full overflow-hidden ml-auto">
              <div
                className="h-full bg-gold rounded-full"
                style={{ width: `${project.progress_pct}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* ── Tab Bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-4 border-b border-surface-border">
        {(["overview", "schedule"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-gold text-content-primary"
                : "border-transparent text-content-muted hover:text-content-secondary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          {/* ── Role CTA ──────────────────────────────────────────────────────── */}
          <RoleCTABar projectId={projectId} />

          {/* ── Main Grid ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* Left column */}
            <div className="lg:col-span-3 space-y-4">
              {leftSections}
            </div>

            {/* Right column */}
            <div className="lg:col-span-2 space-y-4">

              {/* Project Snapshot — de-emphasize for field/maintenance */}
              <Card
                variant="default"
                className={roleGroup === "field" || roleGroup === "maintenance" ? "opacity-80" : undefined}
              >
                <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted mb-4">Project Snapshot</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {
                      label:  "Assets",
                      value:  projectAssets.length,
                      icon:   <Truck size={13} className="text-content-muted" />,
                      accent: false,
                    },
                    {
                      label:  "Crews",
                      value:  projectCrews.length,
                      icon:   <Users size={13} className="text-content-muted" />,
                      accent: false,
                    },
                    {
                      label:  "Open Issues",
                      value:  openIssues.length,
                      icon:   <AlertCircle size={13} className={hasCritical ? "text-status-critical" : "text-content-muted"} />,
                      accent: hasCritical,
                    },
                    {
                      label:  "Alerts",
                      value:  projectAlerts.length,
                      icon:   <Bell size={13} className={unreadAlerts.length > 0 ? "text-status-warning" : "text-content-muted"} />,
                      accent: unreadAlerts.length > 0,
                    },
                  ].map(({ label, value, icon, accent }) => (
                    <div
                      key={label}
                      className={`rounded-lg p-3 border ${accent ? "border-status-critical/20 bg-status-critical/5" : "border-surface-border bg-surface-overlay"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {icon}
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-content-muted">{label}</span>
                      </div>
                      <p className={`text-2xl font-bold tabular-nums ${accent ? "text-status-critical" : "text-content-primary"}`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Quick Actions */}
              <Card variant="default" className="!p-0">
                <div className="p-5 pb-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted">Project Actions</p>
                  <p className="text-xs text-content-muted mt-0.5">Launch a module for this job</p>
                </div>
                <div className="px-5 pb-5 grid grid-cols-2 gap-2">
                  {MODULE_ACTIONS.map((action) => {
                  const href = action.key === "fix"
                    ? buildFixUrl({ source: "project-command-center", projectId, returnTo: `/projects/${projectId}` })
                    : action.href;
                  return (
                    <Link
                      key={action.key}
                      href={href}
                      className={`group flex items-start gap-2.5 p-3 rounded-lg border border-surface-border bg-surface-overlay transition-colors ${action.hover}`}
                    >
                      <div className="mt-0.5 shrink-0">{action.icon}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-content-primary group-hover:text-white transition-colors">
                          {action.label}
                        </p>
                        <p className="text-[11px] text-content-muted mt-0.5 leading-snug">{action.description}</p>
                      </div>
                    </Link>
                  );
                })}
                </div>
              </Card>

              {/* Field Assets */}
              {projectAssets.length > 0 && (
                <Card variant="default" className="!p-0">
                  <div className="p-5 pb-3">
                    <SectionHeader
                      title="Field Assets"
                      subtitle={`${projectAssets.length} on this project`}
                    />
                  </div>
                  <div>
                    {projectAssets.slice(0, 4).map((asset) => (
                      <div key={asset.id} className="flex items-center gap-3 px-5 py-2.5 border-t border-surface-border">
                        <Truck size={13} className="shrink-0 text-content-muted" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-content-primary truncate">{asset.name}</p>
                          <p className="text-xs text-content-muted">{asset.type}</p>
                        </div>
                        <StatusBadge status={asset.status} />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

            </div>
          </div>
        </>
      )}

      {activeTab === "schedule" && (
        <ScheduleTab projectId={projectId} role={role} />
      )}

      {canEdit && (
        <ProjectInspectorPanel
          key={project.id}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          project={project}
        />
      )}
    </PageContainer>
  );
}
