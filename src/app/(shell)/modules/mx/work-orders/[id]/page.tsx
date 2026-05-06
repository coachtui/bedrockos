"use client";

import { useState, use } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { useMx } from "@/providers/MxProvider";
import { useOrg } from "@/providers/OrgProvider";
import {
  STATUS_LABELS, STATUS_BADGE,
  PRIORITY_LABELS, PRIORITY_BADGE,
  CATEGORY_LABELS,
  READINESS_LABELS, READINESS_BADGE,
  WO_TRANSITIONS,
  canAssignMechanic, canUpdateWorkOrderStatus, canApproveWorkOrder,
} from "@/lib/mx/rules";
import { deriveReadiness } from "@/lib/mx/readiness";
import type { MxWorkOrderStatus, MxWorkOrderPriority } from "@/lib/mx/types";
import type { OrgWorker } from "@/types/domain";
import {
  ArrowLeft, User, Wrench, AlertTriangle, CalendarDays,
  Building2, ChevronRight, UserPlus, X,
} from "lucide-react";

// ── Urgency helpers ───────────────────────────────────────────────────────────

type Urgency = "overdue" | "today" | "tomorrow";

function getUrgency(neededByDate?: string): Urgency | null {
  if (!neededByDate) return null;
  const today    = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];
  if (neededByDate < today)      return "overdue";
  if (neededByDate === today)    return "today";
  if (neededByDate === tomorrow) return "tomorrow";
  return null;
}

const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: "Overdue", today: "Due Today", tomorrow: "Due Tomorrow",
};

const URGENCY_CHIP: Record<Urgency, string> = {
  overdue:  "text-status-critical bg-status-critical/10 border-status-critical/30 font-bold",
  today:    "text-gold bg-gold/10 border-gold/30 font-semibold",
  tomorrow: "text-content-secondary bg-surface-border border-surface-border-hover",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { workOrders, updateWorkOrderStatus, updateWorkOrder, assignMechanic, unassignMechanic } = useMx();
  const { role, workers } = useOrg();

  const wo = workOrders.find((w) => w.id === id);

  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const mechanics = workers.filter((w) => w.role === "mechanic");

  if (!wo) {
    return (
      <PageContainer>
        <div className="flex items-center gap-3 mb-6">
          <Link href="/modules/mx/work-orders" className="text-content-muted hover:text-content-primary">
            <ArrowLeft size={16} />
          </Link>
          <p className="text-sm text-content-muted">Work order not found.</p>
        </div>
      </PageContainer>
    );
  }

  const readiness     = wo.equipmentId
    ? deriveReadiness(wo.equipmentId, wo.equipmentLabel ?? wo.equipmentId, workOrders)
    : null;
  const allowedNext   = WO_TRANSITIONS[wo.status];
  const canTransition = canUpdateWorkOrderStatus(role);
  const canAssign     = canAssignMechanic(role);
  const canApprove    = canApproveWorkOrder(role);

  const visibleNext = allowedNext.filter((s) => {
    if (s === "approved" && !canApprove) return false;
    return true;
  });

  const urgency = getUrgency(wo.neededByDate);

  const PRIORITIES: MxWorkOrderPriority[] = ["critical", "high", "medium", "low"];

  function handleStatusChange(status: MxWorkOrderStatus) {
    updateWorkOrderStatus(wo!.id, status);
  }

  function handlePriorityChange(priority: MxWorkOrderPriority) {
    updateWorkOrder(wo!.id, { priority });
  }

  function handleAssign(mechanic: OrgWorker) {
    assignMechanic(wo!.id, mechanic.id);
    setShowAssignPanel(false);
  }

  function handleUnassign(mechanicId: string) {
    unassignMechanic(wo!.id, mechanicId);
  }

  const assignedIds = wo.assignedMechanicIds;

  return (
    <PageContainer maxWidth="wide">

      {/* Urgency banner */}
      {urgency && wo.status !== "completed" && wo.status !== "canceled" && (
        <div className={`flex items-center gap-2 px-4 py-2.5 mb-4 rounded-[var(--radius-card)] border text-xs font-semibold ${URGENCY_CHIP[urgency]}`}>
          <CalendarDays size={13} />
          {URGENCY_LABEL[urgency]}: Needed by {wo.neededByDate}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href="/modules/mx/work-orders"
            className="mt-1 text-content-muted hover:text-content-primary transition-colors flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-1.5 mb-1">
              <span className="text-xs font-mono text-content-muted">{wo.woNumber}</span>
              <span className={`text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${STATUS_BADGE[wo.status]}`}>
                {STATUS_LABELS[wo.status]}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${PRIORITY_BADGE[wo.priority]}`}>
                {PRIORITY_LABELS[wo.priority]}
              </span>
              {wo.opsBlocking && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border border-status-critical/30 bg-status-critical/10 text-status-critical rounded-[var(--radius-badge)] px-1.5 py-0.5">
                  <AlertTriangle size={10} /> OPS Blocking
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold text-content-primary leading-snug">{wo.title}</h1>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Priority change */}
          {canTransition && (
            <select
              className="text-xs bg-surface-overlay border border-surface-border rounded-lg px-3 py-1.5 text-content-secondary focus:outline-none focus:border-teal cursor-pointer"
              value={wo.priority}
              onChange={(e) => handlePriorityChange(e.target.value as MxWorkOrderPriority)}
              title="Change priority"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          )}

          {/* Status transition */}
          {canTransition && visibleNext.length > 0 && (
            <select
              className="text-xs bg-surface-overlay border border-surface-border rounded-lg px-3 py-1.5 text-content-secondary focus:outline-none focus:border-teal cursor-pointer"
              value=""
              onChange={(e) => {
                if (e.target.value) handleStatusChange(e.target.value as MxWorkOrderStatus);
              }}
            >
              <option value="" disabled>Move to…</option>
              {visibleNext.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left: Summary + Equipment ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Summary */}
          <Card variant="default">
            <h2 className="text-xs font-bold uppercase tracking-widest text-content-muted mb-3">Summary</h2>
            {wo.description ? (
              <p className="text-sm text-content-secondary leading-relaxed">{wo.description}</p>
            ) : (
              <p className="text-sm text-content-muted italic">No description provided.</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
              <div>
                <span className="text-content-muted">Category</span>
                <p className="font-semibold text-content-primary mt-0.5">{CATEGORY_LABELS[wo.category]}</p>
              </div>
              <div>
                <span className="text-content-muted">Requested By</span>
                <p className="font-semibold text-content-primary mt-0.5">{wo.requestedBy}</p>
              </div>
              <div>
                <span className="text-content-muted">Requested Date</span>
                <p className="font-semibold text-content-primary mt-0.5">{wo.requestedDate}</p>
              </div>
              {wo.neededByDate && (
                <div>
                  <span className="text-content-muted">Needed By</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className={`font-semibold ${urgency === "overdue" ? "text-status-critical" : urgency === "today" ? "text-gold" : "text-content-primary"}`}>
                      {wo.neededByDate}
                    </p>
                    {urgency && (
                      <span className={`text-[9px] border rounded px-1 py-0 ${URGENCY_CHIP[urgency]}`}>
                        {URGENCY_LABEL[urgency]}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {wo.estimatedHours !== undefined && (
                <div>
                  <span className="text-content-muted">Estimated Hours</span>
                  <p className="font-semibold text-content-primary mt-0.5">{wo.estimatedHours}h</p>
                </div>
              )}
              {wo.scheduledStart && (
                <div>
                  <span className="text-content-muted">Scheduled Start</span>
                  <p className="font-semibold text-content-primary mt-0.5">
                    {new Date(wo.scheduledStart).toLocaleString()}
                  </p>
                </div>
              )}
              {wo.scheduledEnd && (
                <div>
                  <span className="text-content-muted">Scheduled End</span>
                  <p className="font-semibold text-content-primary mt-0.5">
                    {new Date(wo.scheduledEnd).toLocaleString()}
                  </p>
                </div>
              )}
              {wo.actualStart && (
                <div>
                  <span className="text-content-muted">Actual Start</span>
                  <p className="font-semibold text-content-primary mt-0.5">
                    {new Date(wo.actualStart).toLocaleString()}
                  </p>
                </div>
              )}
              {wo.actualEnd && (
                <div>
                  <span className="text-content-muted">Actual End</span>
                  <p className="font-semibold text-content-primary mt-0.5">
                    {new Date(wo.actualEnd).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            {wo.completionNotes && (
              <div className="mt-4 pt-4 border-t border-surface-border">
                <p className="text-xs font-semibold text-content-muted mb-1">Notes</p>
                <p className="text-sm text-content-secondary">{wo.completionNotes}</p>
              </div>
            )}
          </Card>

          {/* Equipment */}
          {wo.equipmentId && (
            <Card variant="default">
              <h2 className="text-xs font-bold uppercase tracking-widest text-content-muted mb-3">Equipment</h2>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-content-primary">{wo.equipmentLabel}</p>
                  {wo.projectName && (
                    <div className="flex items-center gap-1 mt-1">
                      <Building2 size={11} className="text-content-muted" />
                      <p className="text-xs text-content-muted">{wo.projectName}</p>
                    </div>
                  )}
                </div>
                {readiness && (
                  <div className="text-right">
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${READINESS_BADGE[readiness.status]}`}>
                      {READINESS_LABELS[readiness.status]}
                    </span>
                    {readiness.reason && (
                      <p className="text-[10px] text-content-muted mt-1">{readiness.reason}</p>
                    )}
                  </div>
                )}
              </div>
              {wo.readinessImpact && (
                <div className="mt-3 pt-3 border-t border-surface-border flex items-center gap-2">
                  <span className="text-xs text-content-muted">Declared impact while open:</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${READINESS_BADGE[wo.readinessImpact]}`}>
                    {READINESS_LABELS[wo.readinessImpact]}
                  </span>
                </div>
              )}
            </Card>
          )}

        </div>

        {/* ── Right: Assignments + Links ──────────────────────────────────── */}
        <div className="space-y-4">

          {/* Mechanic Assignments */}
          <Card variant="default">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-content-muted">
                Mechanics
                {assignedIds.length > 0 && (
                  <span className="ml-1.5 text-[10px] font-bold text-teal bg-teal/10 border border-teal/30 rounded-full px-1.5 py-0.5">
                    {assignedIds.length}
                  </span>
                )}
              </h2>
              {canAssign && (
                <button
                  onClick={() => setShowAssignPanel(true)}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal hover:underline"
                >
                  <UserPlus size={11} /> Assign
                </button>
              )}
            </div>

            {assignedIds.length === 0 ? (
              <div className="py-3 text-center border border-dashed border-surface-border rounded-lg">
                <User size={16} className="mx-auto text-content-muted mb-1" />
                <p className="text-xs text-content-muted">No mechanics assigned</p>
                {canAssign && (
                  <button
                    onClick={() => setShowAssignPanel(true)}
                    className="mt-1 text-[10px] text-teal hover:underline"
                  >
                    Assign one →
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {assignedIds.map((mid) => {
                  const found = mechanics.find((m) => m.id === mid);
                  return (
                    <div
                      key={mid}
                      className="flex items-center justify-between bg-surface-overlay border border-surface-border rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-teal/20 border border-teal/30 flex items-center justify-center flex-shrink-0">
                          <User size={11} className="text-teal" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-content-primary">
                            {found?.name ?? mid}
                          </p>
                          {found?.role && (
                            <p className="text-[10px] text-content-muted capitalize">{found.role}</p>
                          )}
                        </div>
                      </div>
                      {canAssign && (
                        <button
                          onClick={() => handleUnassign(mid)}
                          className="p-0.5 rounded hover:bg-surface-border text-content-muted hover:text-content-primary transition-colors"
                          aria-label="Remove assignment"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Context links */}
          <Card variant="default">
            <h2 className="text-xs font-bold uppercase tracking-widest text-content-muted mb-3">Links</h2>
            <div className="space-y-2">
              <Link
                href="/modules/mx/scheduling"
                className="flex items-center justify-between px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg hover:border-teal/30 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <CalendarDays size={13} className="text-content-muted" />
                  <span className="text-xs text-content-secondary">View Scheduling</span>
                </div>
                <ChevronRight size={13} className="text-content-muted group-hover:text-teal transition-colors" />
              </Link>
              <Link
                href="/modules/mx/readiness"
                className="flex items-center justify-between px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg hover:border-teal/30 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <Wrench size={13} className="text-content-muted" />
                  <span className="text-xs text-content-secondary">Equipment Readiness</span>
                </div>
                <ChevronRight size={13} className="text-content-muted group-hover:text-teal transition-colors" />
              </Link>
            </div>
          </Card>

        </div>
      </div>

      {/* ── Assign panel overlay ─────────────────────────────────────────── */}
      {showAssignPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAssignPanel(false)} />
          <div className="relative w-full max-w-sm bg-surface-raised border border-surface-border rounded-[var(--radius-card)] shadow-[var(--shadow-card)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
              <h3 className="text-sm font-bold text-content-primary">Assign Mechanic</h3>
              <button onClick={() => setShowAssignPanel(false)} className="p-1 rounded hover:bg-surface-overlay text-content-muted">
                <X size={14} />
              </button>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto">
              <div className="space-y-2">
                  {mechanics
                    .filter((m) => !assignedIds.includes(m.id))
                    .map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleAssign(m)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 bg-surface-overlay border border-surface-border rounded-lg hover:border-teal/30 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-teal/20 border border-teal/30 flex items-center justify-center flex-shrink-0">
                          <User size={12} className="text-teal" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-content-primary">{m.name}</p>
                          <p className="text-[10px] text-content-muted capitalize">
                            {m.role}{!m.available && " · Unavailable"}
                          </p>
                        </div>
                        {!m.available && (
                          <span className="ml-auto text-[10px] text-content-secondary border border-surface-border-hover bg-surface-border rounded px-1.5 py-0.5">Busy</span>
                        )}
                      </button>
                    ))}
                  {mechanics.filter((m) => !assignedIds.includes(m.id)).length === 0 && (
                    <p className="text-xs text-content-muted text-center py-4">All mechanics already assigned.</p>
                  )}
                </div>
            </div>
          </div>
        </div>
      )}

    </PageContainer>
  );
}
