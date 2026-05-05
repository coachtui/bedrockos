"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { useMx } from "@/providers/MxProvider";
import { useOrg } from "@/providers/OrgProvider";
import { deriveReadiness } from "@/lib/mx/readiness";
import {
  READINESS_LABELS, READINESS_BADGE,
  PRIORITY_LABELS, PRIORITY_BADGE,
  ACTIVE_STATUSES,
} from "@/lib/mx/rules";
import type { ReadinessStatus } from "@/lib/mx/types";
import { ArrowLeft, AlertTriangle, CheckCircle2, Wrench, ChevronRight } from "lucide-react";

// ── Readiness summary counts ──────────────────────────────────────────────────

const READINESS_ORDER: ReadinessStatus[] = [
  "down", "in_shop", "awaiting_parts", "at_risk", "scheduled_service", "limited", "ready",
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MxReadinessPage() {
  const { workOrders, readiness: derivedReadiness } = useMx();
  const { assets } = useOrg();

  // Merge derived readiness with all known assets
  // Assets with no active WOs get "ready" status
  const allReadiness = useMemo(() => {
    return assets.map((asset) => {
      const found = derivedReadiness.find((r) => r.equipmentId === asset.id);
      if (found) return found;
      // No active work orders → derive as ready
      return deriveReadiness(asset.id, asset.name, workOrders);
    });
  }, [assets, derivedReadiness, workOrders]);

  // Summary counts
  const counts = useMemo(() => {
    const c: Partial<Record<ReadinessStatus, number>> = {};
    for (const r of allReadiness) {
      c[r.status] = (c[r.status] ?? 0) + 1;
    }
    return c;
  }, [allReadiness]);

  // Sort by readiness severity (down first, ready last)
  const sorted = [...allReadiness].sort(
    (a, b) => READINESS_ORDER.indexOf(a.status) - READINESS_ORDER.indexOf(b.status),
  );

  const opsBlockingCount = allReadiness.filter((r) => r.blockingWorkOrderIds.length > 0).length;

  return (
    <PageContainer maxWidth="wide">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/modules/mx" className="text-content-muted hover:text-content-primary transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-content-primary">Equipment Readiness</h1>
          <p className="text-xs text-content-muted">{assets.length} assets tracked</p>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface-raised border border-status-critical/20 rounded-[var(--radius-card)] p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={13} className="text-status-critical" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-status-critical">Down / Blocked</span>
          </div>
          <p className="text-2xl font-bold text-content-primary">
            {(counts["down"] ?? 0) + (counts["in_shop"] ?? 0)}
          </p>
          <p className="text-xs text-content-muted mt-0.5">in shop or down</p>
        </div>
        <div className="bg-surface-raised border border-gold/20 rounded-[var(--radius-card)] p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Wrench size={13} className="text-gold" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold">At Risk</span>
          </div>
          <p className="text-2xl font-bold text-content-primary">
            {(counts["at_risk"] ?? 0) + (counts["awaiting_parts"] ?? 0)}
          </p>
          <p className="text-xs text-content-muted mt-0.5">at risk or awaiting parts</p>
        </div>
        <div className="bg-surface-raised border border-teal/20 rounded-[var(--radius-card)] p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Wrench size={13} className="text-teal" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal">Service</span>
          </div>
          <p className="text-2xl font-bold text-content-primary">
            {(counts["scheduled_service"] ?? 0) + (counts["limited"] ?? 0)}
          </p>
          <p className="text-xs text-content-muted mt-0.5">scheduled or limited</p>
        </div>
        <div className="bg-surface-raised border border-teal/20 rounded-[var(--radius-card)] p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 size={13} className="text-teal" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal">Ready</span>
          </div>
          <p className="text-2xl font-bold text-content-primary">{counts["ready"] ?? 0}</p>
          <p className="text-xs text-content-muted mt-0.5">fully operational</p>
        </div>
      </div>

      {opsBlockingCount > 0 && (
        <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-status-critical/5 border border-status-critical/20 rounded-lg">
          <AlertTriangle size={14} className="text-status-critical flex-shrink-0" />
          <p className="text-xs text-content-secondary">
            <span className="font-semibold text-status-critical">{opsBlockingCount} asset{opsBlockingCount !== 1 ? "s" : ""}</span> have active OPS-blocking work orders — OPS planning may be impacted.
          </p>
        </div>
      )}

      {/* Asset readiness grid */}
      <div className="space-y-2">
        {/* Column headers */}
        <div className="grid grid-cols-12 gap-3 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-content-muted">
          <div className="col-span-3">Equipment</div>
          <div className="col-span-2">Readiness</div>
          <div className="col-span-3">Reason</div>
          <div className="col-span-2">Blocking WOs</div>
          <div className="col-span-2 text-right">OPS Impact</div>
        </div>

        {sorted.map((r) => {
          const asset         = assets.find((a) => a.id === r.equipmentId);
          const activeWos     = workOrders.filter(
            (wo) => wo.equipmentId === r.equipmentId && ACTIVE_STATUSES.includes(wo.status),
          );
          const hasOpsBlocking = r.blockingWorkOrderIds.length > 0;

          return (
            <div
              key={r.equipmentId}
              className={`grid grid-cols-12 gap-3 items-center px-4 py-3 bg-surface-raised border rounded-[var(--radius-card)] ${
                hasOpsBlocking
                  ? "border-status-critical/20"
                  : "border-surface-border"
              }`}
            >
              {/* Equipment */}
              <div className="col-span-3">
                <p className="text-sm font-semibold text-content-primary leading-snug">{r.equipmentLabel}</p>
                {asset?.type && (
                  <p className="text-[10px] text-content-muted">{asset.type}</p>
                )}
              </div>

              {/* Readiness badge */}
              <div className="col-span-2">
                <span className={`inline-block text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${READINESS_BADGE[r.status]}`}>
                  {READINESS_LABELS[r.status]}
                </span>
              </div>

              {/* Reason */}
              <div className="col-span-3">
                <p className="text-xs text-content-secondary">{r.reason ?? "—"}</p>
                {r.nextAvailableAt && (
                  <p className="text-[10px] text-content-muted">
                    Available {new Date(r.nextAvailableAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Blocking WO count */}
              <div className="col-span-2">
                {activeWos.length > 0 ? (
                  <div className="space-y-1">
                    {activeWos.slice(0, 2).map((wo) => (
                      <Link
                        key={wo.id}
                        href={`/modules/mx/work-orders/${wo.id}`}
                        className="flex items-center gap-1 hover:underline"
                      >
                        <span className={`text-[9px] font-semibold border rounded px-1 py-0.5 ${PRIORITY_BADGE[wo.priority]}`}>
                          {PRIORITY_LABELS[wo.priority]}
                        </span>
                        <span className="text-[10px] text-content-secondary truncate">{wo.woNumber}</span>
                      </Link>
                    ))}
                    {activeWos.length > 2 && (
                      <p className="text-[10px] text-content-muted">+{activeWos.length - 2} more</p>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-content-muted">—</span>
                )}
              </div>

              {/* OPS Impact */}
              <div className="col-span-2 flex justify-end">
                {hasOpsBlocking ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-status-critical border border-status-critical/30 bg-status-critical/10 rounded-[var(--radius-badge)] px-1.5 py-0.5">
                    <AlertTriangle size={10} /> Blocking
                  </span>
                ) : (
                  <span className="text-[10px] text-content-muted">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* OPS integration scaffold note */}
      <div className="mt-8 p-4 border border-dashed border-surface-border rounded-[var(--radius-card)]">
        <p className="text-xs font-semibold text-content-muted mb-1">OPS Integration — Scaffold Point</p>
        <p className="text-xs text-content-muted leading-relaxed">
          Readiness data from <code className="font-mono">useMx().readiness</code> or the{" "}
          <code className="font-mono">deriveReadiness()</code> helper in{" "}
          <code className="font-mono">src/lib/mx/readiness.ts</code> is importable by any OPS surface.
          Equipment readiness badges can be added to pour schedule cards, asset detail views, and
          project command centers without modifying MX module state.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Link
            href="/modules/ops/pour-schedule"
            className="inline-flex items-center gap-1 text-xs text-content-muted hover:text-teal transition-colors"
          >
            Pour Schedule <ChevronRight size={12} />
          </Link>
          <Link
            href="/assets"
            className="inline-flex items-center gap-1 text-xs text-content-muted hover:text-teal transition-colors"
          >
            Assets <ChevronRight size={12} />
          </Link>
        </div>
      </div>

    </PageContainer>
  );
}
