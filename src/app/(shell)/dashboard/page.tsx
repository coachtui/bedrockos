"use client";

import React from "react";
import Link from "next/link";
import { Users, Bell } from "lucide-react";
import { FixLaunchButton } from "@/components/modules/fix/FixLaunchButton";
import { PageContainer } from "@/components/ui/PageContainer";
import { ActiveProjectsCard } from "@/components/dashboard/ActiveProjectsCard";
import { OpenIssuesCard } from "@/components/dashboard/OpenIssuesCard";
import { AlertsCard } from "@/components/dashboard/AlertsCard";
import { ModuleLaunchpad } from "@/components/dashboard/ModuleLaunchpad";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { useOrg } from "@/providers/OrgProvider";
import { getRoleGroup, type RoleGroup } from "@/lib/utils/roles";
import type { UserRole } from "@/types/org";

// ── Page title per role ───────────────────────────────────────────────────────

const PAGE_TITLE: Record<UserRole, string> = {
  owner:              "System Overview",
  admin:              "System Overview",
  equipment_director: "System Overview",
  operations_manager: "System Overview",
  pm:                 "System Overview",
  project_engineer:   "System Overview",
  superintendent:     "Current Project Status",
  foreman:            "Current Project Status",
  mechanic:           "Equipment Status & Issues",
  viewer:             "System Overview",
};

// ── Context banner ────────────────────────────────────────────────────────────

function ContextBanner() {
  const { currentOrganization, currentProject, currentUser, role } = useOrg();
  const firstName = currentUser.name.split(" ")[0];
  const pageTitle = PAGE_TITLE[role] ?? "System Overview";

  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <h2 className="text-xl font-bold text-content-primary">
          Welcome back, {firstName}
        </h2>
        <p className="text-sm text-content-muted mt-0.5">
          {currentOrganization.name} &middot; {currentProject.name}
        </p>
      </div>
      <span className="hidden sm:block text-[11px] font-bold uppercase tracking-widest text-content-muted mt-1.5">
        {pageTitle}
      </span>
    </div>
  );
}

// ── Role-specific CTA ─────────────────────────────────────────────────────────

function RoleCTA() {
  const { role, currentProject, currentOrganization } = useOrg();
  const roleGroup = getRoleGroup(role);

  if (roleGroup === "maintenance") {
    return (
      <div className="mb-6">
        <FixLaunchButton
          context={{
            source:    "dashboard",
            projectId: currentProject.id,
            orgId:     currentOrganization.id,
            role,
            returnTo:  "/dashboard",
          }}
          label="Run Fix"
          variant="outline"
        />
      </div>
    );
  }

  if (roleGroup === "field") {
    return (
      <div className="mb-6">
        <Link
          href="/modules/cru/crews?source=dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gold border border-gold/30 bg-gold/5 hover:bg-gold/15 px-4 py-2 rounded-lg transition-colors"
        >
          <Users size={14} />
          Assign Crew
        </Link>
      </div>
    );
  }

  if (role === "project_engineer") {
    return (
      <div className="mb-6">
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

  if (role === "pm") {
    return (
      <div className="mb-6">
        <Link
          href="/alerts"
          className="inline-flex items-center gap-2 text-sm font-semibold text-status-warning border border-status-warning/30 bg-status-warning/5 hover:bg-status-warning/15 px-4 py-2 rounded-lg transition-colors"
        >
          <Bell size={14} />
          Review Alerts
        </Link>
      </div>
    );
  }

  return null;
}

// ── Metric row (role-ordered) ─────────────────────────────────────────────────

const METRIC_ORDER: Record<RoleGroup, Array<"projects" | "issues" | "alerts">> = {
  oversight:   ["projects", "issues",   "alerts"],
  office:      ["projects", "alerts",   "issues"],
  field:       ["issues",   "alerts",   "projects"],
  maintenance: ["issues",   "alerts",   "projects"],
};

function MetricRow() {
  const { role } = useOrg();
  const roleGroup = getRoleGroup(role);
  const order = METRIC_ORDER[roleGroup];

  const cards: Record<string, React.ReactNode> = {
    projects: <ActiveProjectsCard />,
    issues:   <OpenIssuesCard />,
    alerts:   <AlertsCard />,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {order.map((key) => (
        <React.Fragment key={key}>{cards[key]}</React.Fragment>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <PageContainer maxWidth="wide">
      <ContextBanner />
      <RoleCTA />
      <MetricRow />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <ModuleLaunchpad />
        </div>
        <div className="lg:col-span-3">
          <RecentActivityFeed />
        </div>
      </div>
    </PageContainer>
  );
}
