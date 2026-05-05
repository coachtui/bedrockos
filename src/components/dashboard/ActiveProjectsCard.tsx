"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MetricTile } from "@/components/ui/MetricTile";
import { useOrg } from "@/providers/OrgProvider";
import { useMx } from "@/providers/MxProvider";
import { getRoleGroup } from "@/lib/utils/roles";

// ── Mechanic variant: equipment readiness from MX ─────────────────────────────

function EquipmentStatusCard() {
  const { readiness } = useMx();

  const down      = readiness.filter((r) => r.status === "down");
  const degraded  = readiness.filter((r) => ["in_shop", "awaiting_parts", "at_risk"].includes(r.status));
  const limited   = readiness.filter((r) => ["limited", "scheduled_service"].includes(r.status));
  const ready     = readiness.filter((r) => r.status === "ready");

  const total     = readiness.length;
  const hasIssues = down.length > 0 || degraded.length > 0;

  const rows = [
    { label: "Down",     items: down,     color: "text-status-critical", bar: "bg-status-critical", dot: "bg-status-critical" },
    { label: "Degraded", items: degraded, color: "text-gold",            bar: "bg-gold",            dot: "bg-gold"            },
    { label: "Limited",  items: limited,  color: "text-blue-brand",      bar: "bg-blue-brand",      dot: "bg-blue-brand"      },
    { label: "Ready",    items: ready,    color: "text-teal",            bar: "bg-teal",            dot: "bg-teal"            },
  ];

  return (
    <Card variant={hasIssues ? "accent-gold" : "default"}>
      <div className="flex items-start justify-between mb-4">
        <MetricTile
          label="Equipment Status"
          value={total}
          accentColor={down.length > 0 ? "red" : "gold"}
        />
        <Link href="/modules/ops/work-orders" className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1">
          View <ArrowRight size={11} />
        </Link>
      </div>

      <div className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <span className="text-xs text-content-muted w-14 shrink-0">{row.label}</span>
            <div className="flex-1 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
              {row.items.length > 0 && total > 0 && (
                <div
                  className={`h-full ${row.bar} rounded-full`}
                  style={{ width: `${(row.items.length / total) * 100}%` }}
                />
              )}
            </div>
            <span className={`text-xs font-semibold tabular-nums w-4 text-right ${row.color}`}>
              {row.items.length}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Field variant: site maintenance impact from MX ────────────────────────────

function SiteMaintenanceCard() {
  const { workOrders } = useMx();
  const { currentProject } = useOrg();

  const siteWOs   = workOrders.filter(
    (wo) => wo.projectId === currentProject.id && wo.status !== "completed" && wo.status !== "canceled",
  );
  const blocking  = siteWOs.filter((wo) => wo.opsBlocking);
  const monitored = siteWOs.filter((wo) => !wo.opsBlocking);
  const top3      = siteWOs.slice(0, 3);

  return (
    <Card variant={blocking.length > 0 ? "accent-gold" : "default"}>
      <div className="flex items-start justify-between mb-4">
        <MetricTile
          label="Site Maintenance"
          value={siteWOs.length}
          accentColor={blocking.length > 0 ? "red" : "blue"}
        />
        <Link href="/modules/ops/work-orders" className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1">
          View <ArrowRight size={11} />
        </Link>
      </div>

      {siteWOs.length === 0 ? (
        <p className="text-xs text-content-muted">No active maintenance issues on your site.</p>
      ) : (
        <div className="space-y-2.5">
          {blocking.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-status-critical font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-status-critical shrink-0" />
              {blocking.length} OPS-blocking
            </div>
          )}
          {top3.map((wo) => (
            <div key={wo.id} className="flex items-center justify-between gap-2 min-w-0">
              <p className="text-xs text-content-secondary truncate">{wo.equipmentLabel ?? wo.title}</p>
              <StatusBadge status={wo.status} size="sm" />
            </div>
          ))}
          {siteWOs.length > 3 && (
            <p className="text-[10px] text-content-muted">+{siteWOs.length - 3} more</p>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Default: active projects ──────────────────────────────────────────────────

export function ActiveProjectsCard() {
  const { role, projects } = useOrg();
  const roleGroup = getRoleGroup(role);

  if (roleGroup === "maintenance") return <EquipmentStatusCard />;
  if (roleGroup === "field")       return <SiteMaintenanceCard />;

  const activeProjects = projects.filter((p) => p.status === "active" || p.status === "on_hold");
  const top3 = activeProjects.slice(0, 3);

  return (
    <Card variant="default">
      <div className="flex items-start justify-between mb-4">
        <MetricTile
          label="Active Projects"
          value={activeProjects.length}
          accentColor="gold"
        />
        <Link href="/projects" className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1">
          View all <ArrowRight size={11} />
        </Link>
      </div>

      <div className="space-y-3">
        {top3.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="group block space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-content-primary group-hover:text-gold transition-colors truncate">{project.name}</span>
              <StatusBadge status={project.status} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-all duration-300"
                  style={{ width: `${project.progress_pct}%` }}
                />
              </div>
              <span className="text-xs text-content-muted tabular-nums shrink-0">{project.progress_pct}%</span>
            </div>
            <p className="text-xs text-content-muted">{project.phase} · {project.location}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
