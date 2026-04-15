"use client";

/**
 * WoInspectorPanel — MX work order detail + actions in the right-side inspector.
 *
 * Replaces the full-page detail route for common workflows:
 *   - Status transitions
 *   - Priority change
 *   - Mechanic assignment / unassignment
 *   - Notes / completion notes
 *
 * Used from:
 *   - MX Work Orders list (replaces row Link navigation)
 *   - MX Scheduling board (replaces QueueCard / LaneItem title links)
 *
 * The dedicated detail route (/modules/mx/work-orders/[id]) still exists
 * for deep-links and bookmarking.
 */

import { useState, useEffect } from "react";
import { InspectorPanel } from "@/components/ui/InspectorPanel";
import { useMx } from "@/providers/MxProvider";
import { useOrg } from "@/providers/OrgProvider";
import { getOrgMechanicsAndDrivers } from "@/lib/registry";
import type { OrgWorker } from "@/types/domain";
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
import {
  AlertTriangle, CalendarDays, Building2,
  User, UserPlus, X, ChevronRight, Wrench,
  Send, FileText,
} from "lucide-react";

// ── Urgency helpers (local copy — avoids importing from a page file) ──────────

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

// ── Component ─────────────────────────────────────────────────────────────────

interface WoInspectorPanelProps {
  /** ID of the work order to inspect. null means closed. */
  woId:    string | null;
  onClose: () => void;
}

export function WoInspectorPanel({ woId, onClose }: WoInspectorPanelProps) {
  const { workOrders, updateWorkOrderStatus, updateWorkOrder, assignMechanic, unassignMechanic } = useMx();
  const { currentUser, currentOrganization, role } = useOrg();

  const wo = woId ? workOrders.find((w) => w.id === woId) ?? null : null;

  // Mechanics list — load eagerly so names resolve immediately
  const [mechanics,    setMechanics]    = useState<OrgWorker[]>([]);
  const [loadingMechs, setLoadingMechs] = useState(false);
  const [showAssign,   setShowAssign]   = useState(false);

  // Notes editor state
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft,   setNotesDraft]   = useState("");

  // Reset panel state whenever the selected WO changes
  useEffect(() => {
    setShowAssign(false);
    setEditingNotes(false);
    setNotesDraft("");
  }, [woId]);

  // Load mechanics once on open
  useEffect(() => {
    if (!woId) return;
    setLoadingMechs(true);
    getOrgMechanicsAndDrivers(currentOrganization.id)
      .then(setMechanics)
      .finally(() => setLoadingMechs(false));
  }, [woId, currentOrganization.id]);

  const open = !!wo;

  // Derived state
  const readiness = wo?.equipmentId
    ? deriveReadiness(wo.equipmentId, wo.equipmentLabel ?? wo.equipmentId, workOrders)
    : null;

  const allowedNext   = wo ? WO_TRANSITIONS[wo.status] : [];
  const canTransition = canUpdateWorkOrderStatus(role);
  const canAssign     = canAssignMechanic(role);
  const canApprove    = canApproveWorkOrder(role);

  const visibleNext = allowedNext.filter((s) => {
    if (s === "approved" && !canApprove) return false;
    return true;
  });

  const urgency = wo ? getUrgency(wo.neededByDate) : null;

  const PRIORITIES: MxWorkOrderPriority[] = ["critical", "high", "medium", "low"];

  function handleStatusChange(status: MxWorkOrderStatus) {
    if (wo) updateWorkOrderStatus(wo.id, status);
  }

  function handlePriorityChange(priority: MxWorkOrderPriority) {
    if (wo) updateWorkOrder(wo.id, { priority });
  }

  function handleAssign(mechanic: OrgWorker) {
    if (wo) { assignMechanic(wo.id, mechanic.id); setShowAssign(false); }
  }

  function handleUnassign(mechanicId: string) {
    if (wo) unassignMechanic(wo.id, mechanicId);
  }

  function handleSaveNotes() {
    if (wo) {
      updateWorkOrder(wo.id, { completionNotes: notesDraft.trim() || undefined });
      setEditingNotes(false);
    }
  }

  function startEditNotes() {
    setNotesDraft(wo?.completionNotes ?? "");
    setEditingNotes(true);
  }

  // Panel title / badge
  const badge = wo ? (
    <span className={`text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${STATUS_BADGE[wo.status]}`}>
      {STATUS_LABELS[wo.status]}
    </span>
  ) : undefined;

  const subtitle = wo ? `Work Order · ${wo.woNumber}` : undefined;

  return (
    <InspectorPanel
      open={open}
      onClose={onClose}
      title={wo?.title ?? ""}
      subtitle={subtitle}
      badge={badge}
    >
      {wo && (
        <div className="px-5 py-4 space-y-5">

          {/* ── Urgency banner ────────────────────────────────────────────── */}
          {urgency && wo.status !== "completed" && wo.status !== "canceled" && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold -mt-1 ${URGENCY_CHIP[urgency]}`}>
              <CalendarDays size={12} />
              {URGENCY_LABEL[urgency]}: needed by {wo.neededByDate}
            </div>
          )}

          {/* ── OPS blocking ──────────────────────────────────────────────── */}
          {wo.opsBlocking && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-status-critical/30 bg-status-critical/5 text-xs font-semibold text-status-critical -mt-1">
              <AlertTriangle size={12} />
              OPS Blocking — this WO affects equipment readiness for an active pour
            </div>
          )}

          {/* ── Controls: priority + status transition ────────────────────── */}
          {canTransition && (
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="text-xs bg-surface-overlay border border-surface-border rounded-lg px-2.5 py-1.5 text-content-secondary focus:outline-none focus:border-teal cursor-pointer"
                value={wo.priority}
                onChange={(e) => handlePriorityChange(e.target.value as MxWorkOrderPriority)}
                title="Change priority"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>

              {visibleNext.length > 0 && (
                <select
                  className="flex-1 text-xs bg-surface-overlay border border-surface-border rounded-lg px-2.5 py-1.5 text-content-secondary focus:outline-none focus:border-teal cursor-pointer"
                  value=""
                  onChange={(e) => { if (e.target.value) handleStatusChange(e.target.value as MxWorkOrderStatus); }}
                >
                  <option value="" disabled>Move to…</option>
                  {visibleNext.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              )}

              {/* Priority badge (read-only, always visible) */}
              <span className={`text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${PRIORITY_BADGE[wo.priority]}`}>
                {PRIORITY_LABELS[wo.priority]}
              </span>
            </div>
          )}

          {/* ── Summary ───────────────────────────────────────────────────── */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-2">Summary</h3>
            {wo.description ? (
              <p className="text-xs text-content-secondary leading-relaxed">{wo.description}</p>
            ) : (
              <p className="text-xs text-content-muted italic">No description.</p>
            )}
            <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2.5 text-xs">
              <div>
                <p className="text-content-muted">Category</p>
                <p className="font-semibold text-content-primary mt-0.5">{CATEGORY_LABELS[wo.category]}</p>
              </div>
              <div>
                <p className="text-content-muted">Requested By</p>
                <p className="font-semibold text-content-primary mt-0.5">{wo.requestedBy}</p>
              </div>
              <div>
                <p className="text-content-muted">Requested</p>
                <p className="font-semibold text-content-primary mt-0.5">{wo.requestedDate}</p>
              </div>
              {wo.neededByDate && (
                <div>
                  <p className="text-content-muted">Needed By</p>
                  <p className={`font-semibold mt-0.5 ${urgency === "overdue" ? "text-status-critical" : urgency === "today" ? "text-gold" : "text-content-primary"}`}>
                    {wo.neededByDate}
                  </p>
                </div>
              )}
              {wo.estimatedHours !== undefined && (
                <div>
                  <p className="text-content-muted">Est. Hours</p>
                  <p className="font-semibold text-content-primary mt-0.5">{wo.estimatedHours}h</p>
                </div>
              )}
              {wo.scheduledStart && (
                <div>
                  <p className="text-content-muted">Scheduled Start</p>
                  <p className="font-semibold text-content-primary mt-0.5">{new Date(wo.scheduledStart).toLocaleString()}</p>
                </div>
              )}
              {wo.scheduledEnd && (
                <div>
                  <p className="text-content-muted">Scheduled End</p>
                  <p className="font-semibold text-content-primary mt-0.5">{new Date(wo.scheduledEnd).toLocaleString()}</p>
                </div>
              )}
              {wo.actualStart && (
                <div>
                  <p className="text-content-muted">Actual Start</p>
                  <p className="font-semibold text-content-primary mt-0.5">{new Date(wo.actualStart).toLocaleString()}</p>
                </div>
              )}
              {wo.actualEnd && (
                <div>
                  <p className="text-content-muted">Actual End</p>
                  <p className="font-semibold text-content-primary mt-0.5">{new Date(wo.actualEnd).toLocaleString()}</p>
                </div>
              )}
            </div>
          </section>

          {/* ── Equipment + Readiness ────────────────────────────────────── */}
          {wo.equipmentId && (
            <section className="border-t border-surface-border pt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-2">Equipment</h3>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-content-primary">{wo.equipmentLabel}</p>
                  {wo.projectName && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Building2 size={11} className="text-content-muted" />
                      <p className="text-xs text-content-muted">{wo.projectName}</p>
                    </div>
                  )}
                </div>
                {readiness && (
                  <div className="text-right flex-shrink-0">
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${READINESS_BADGE[readiness.status]}`}>
                      {READINESS_LABELS[readiness.status]}
                    </span>
                    {readiness.reason && (
                      <p className="text-[10px] text-content-muted mt-0.5 max-w-[160px] text-right">{readiness.reason}</p>
                    )}
                  </div>
                )}
              </div>
              {wo.readinessImpact && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-content-muted">Impact while open:</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${READINESS_BADGE[wo.readinessImpact]}`}>
                    {READINESS_LABELS[wo.readinessImpact]}
                  </span>
                </div>
              )}
            </section>
          )}

          {/* ── Mechanic Assignments ─────────────────────────────────────── */}
          <section className="border-t border-surface-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted">
                Mechanics
                {wo.assignedMechanicIds.length > 0 && (
                  <span className="ml-1.5 text-[10px] font-bold text-teal bg-teal/10 border border-teal/30 rounded-full px-1.5 py-0.5">
                    {wo.assignedMechanicIds.length}
                  </span>
                )}
              </h3>
              {canAssign && !showAssign && (
                <button
                  onClick={() => setShowAssign(true)}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal hover:underline"
                >
                  <UserPlus size={11} /> Assign
                </button>
              )}
            </div>

            {/* Assigned list */}
            {wo.assignedMechanicIds.length === 0 && !showAssign && (
              <p className="text-xs text-content-muted italic">No mechanics assigned.</p>
            )}
            {wo.assignedMechanicIds.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {wo.assignedMechanicIds.map((mid) => {
                  const found = mechanics.find((m) => m.id === mid);
                  return (
                    <div
                      key={mid}
                      className="flex items-center justify-between bg-surface-overlay border border-surface-border rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-teal/15 border border-teal/30 flex items-center justify-center flex-shrink-0">
                          <User size={11} className="text-teal" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-content-primary">
                            {loadingMechs ? "…" : (found?.name ?? mid)}
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

            {/* Inline assign picker — expands within panel instead of a modal */}
            {showAssign && (
              <div className="border border-teal/20 bg-teal/5 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-teal/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-teal">Select Mechanic</p>
                  <button
                    onClick={() => setShowAssign(false)}
                    className="text-content-muted hover:text-content-primary transition-colors"
                    aria-label="Cancel"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="p-2 max-h-48 overflow-y-auto">
                  {loadingMechs ? (
                    <p className="text-xs text-content-muted py-3 text-center">Loading…</p>
                  ) : (
                    <div className="space-y-1">
                      {mechanics
                        .filter((m) => !wo.assignedMechanicIds.includes(m.id))
                        .map((m) => (
                          <button
                            key={m.id}
                            onClick={() => handleAssign(m)}
                            className="w-full flex items-center gap-2.5 px-2.5 py-2 bg-surface-overlay border border-surface-border rounded-lg hover:border-teal/30 transition-colors text-left"
                          >
                            <div className="w-6 h-6 rounded-full bg-teal/15 border border-teal/30 flex items-center justify-center flex-shrink-0">
                              <User size={10} className="text-teal" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-content-primary truncate">{m.name}</p>
                              <p className="text-[10px] text-content-muted capitalize">
                                {m.role}{!m.available && " · Busy"}
                              </p>
                            </div>
                            {!m.available && (
                              <span className="ml-auto text-[10px] text-content-secondary border border-surface-border-hover bg-surface-border rounded px-1.5 py-0.5 flex-shrink-0">Busy</span>
                            )}
                          </button>
                        ))}
                      {mechanics.filter((m) => !wo.assignedMechanicIds.includes(m.id)).length === 0 && (
                        <p className="text-xs text-content-muted py-3 text-center">All mechanics assigned.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ── Notes ────────────────────────────────────────────────────── */}
          <section className="border-t border-surface-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted">Notes</h3>
              {!editingNotes && canTransition && (
                <button
                  onClick={startEditNotes}
                  className="text-[10px] font-semibold text-content-muted hover:text-teal transition-colors inline-flex items-center gap-1"
                >
                  <FileText size={11} />
                  {wo.completionNotes ? "Edit" : "Add note"}
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-1.5">
                <textarea
                  autoFocus
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Add notes, blockers, or completion details…"
                  rows={3}
                  className="w-full text-xs bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-teal resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSaveNotes();
                    if (e.key === "Escape") setEditingNotes(false);
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveNotes}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-teal text-white rounded hover:opacity-90 transition-opacity"
                  >
                    <Send size={10} /> Save
                  </button>
                  <button
                    onClick={() => setEditingNotes(false)}
                    className="text-[10px] text-content-muted hover:text-content-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : wo.completionNotes ? (
              <p className="text-xs text-content-secondary leading-relaxed">{wo.completionNotes}</p>
            ) : (
              <p className="text-xs text-content-muted italic">No notes.</p>
            )}
          </section>

          {/* ── Deep link to full detail page ────────────────────────────── */}
          <section className="border-t border-surface-border pt-4 pb-2">
            <a
              href={`/modules/mx/work-orders/${wo.id}`}
              className="flex items-center justify-between px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg hover:border-teal/30 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Wrench size={12} className="text-content-muted" />
                <span className="text-xs text-content-secondary">Open full detail page</span>
              </div>
              <ChevronRight size={13} className="text-content-muted group-hover:text-teal transition-colors" />
            </a>
          </section>

        </div>
      )}
    </InspectorPanel>
  );
}
