"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { getCruSiteEventsForOrg } from "@/lib/integrations/cru";
import type { CruSiteEvent } from "@/lib/integrations/cru";
import { useOrg } from "@/providers/OrgProvider";
import { useOps } from "@/providers/OpsProvider";
import type { PourEvent, Request as OpsRequest } from "@/lib/ops/types";
import {
  POUR_STATUS_BADGE,
  canCreatePour,
  canApprovePour,
  canSubmitForApproval,
} from "@/lib/ops/pourRules";
import { CreatePourModal } from "./CreatePourModal";
import type { PourSaveAction } from "./CreatePourModal";
import { PourCalendar } from "./PourCalendar";
import { PourApprovalsPanel } from "./PourApprovalsPanel";
import { PourInspectorPanel } from "@/components/ops/PourInspectorPanel";
import { getJobsitesForUser } from "@/lib/ops/jobsites";
import { useMx } from "@/providers/MxProvider";
import { deriveProjectReadiness } from "@/lib/mx/readiness";
import type { ProjectReadiness } from "@/lib/mx/readiness";
import { ACTIVE_STATUSES } from "@/lib/mx/rules";
import {
  ArrowLeft, AlertTriangle, CheckCircle, Droplets,
  Loader, Truck, Users, Plus, Clock, ChevronDown,
  List, Calendar, ClipboardCheck, Wrench,
} from "lucide-react";

// ── CRU status display ────────────────────────────────────────────────────────

const CRU_STATUS_BADGE: Record<string, string> = {
  planned:   "text-content-secondary border-surface-border-hover bg-surface-border",
  confirmed: "text-gold            border-gold/30           bg-gold/10",
  completed: "text-teal            border-teal/40          bg-teal/20",
};

// Rolling CRU query window: 30 days back through 180 days forward.
// Wide enough to surface recently-completed pours alongside upcoming planning.
function getCruQueryRange(): { start: string; end: string } {
  const fmt   = (d: Date) => d.toISOString().split("T")[0];
  const now   = new Date();
  const start = new Date(now); start.setDate(start.getDate() - 30);
  const end   = new Date(now); end.setDate(end.getDate() + 180);
  return { start: fmt(start), end: fmt(end) };
}

// ── View mode ─────────────────────────────────────────────────────────────────

type ViewMode = "list" | "calendar" | "approvals";

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; pour: PourEvent }
  | null;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PourSchedulePage() {
  const { currentOrganization, currentUser, role, availableProjects } = useOrg();

  const availableJobsites = useMemo(
    () => getJobsitesForUser(currentOrganization.id, currentUser.id, role, availableProjects),
    [currentOrganization.id, currentUser.id, role, availableProjects],
  );

  const {
    pours,
    requests,
    createRequest,
    approveRequest,
    assignRequest,
    createPour,
    editPour,
    submitPourForApproval,
    approvePour,
    rejectPour,
    cancelPour,
  } = useOps();

  const cruOrgId = currentOrganization.cruOrgId ?? currentOrganization.id;

  // ── MX readiness signals ──────────────────────────────────────────────────
  const { workOrders: mxWorkOrders } = useMx();

  const pourReadiness = useMemo(() => {
    const map = new Map<string, ProjectReadiness>();
    for (const pour of pours) {
      if (pour.jobsiteId) {
        map.set(pour.id, deriveProjectReadiness(pour.jobsiteId, mxWorkOrders));
      }
    }
    return map;
  }, [pours, mxWorkOrders]);

  const opsBlockingMxCount = useMemo(
    () => mxWorkOrders.filter((wo) => wo.opsBlocking && ACTIVE_STATUSES.includes(wo.status)).length,
    [mxWorkOrders],
  );

  // ── CRU events ───────────────────────────────────────────────────────────
  const [cruEvents,  setCruEvents]  = useState<CruSiteEvent[]>([]);
  const [loadingCru, setLoadingCru] = useState(true);
  const [cruError,   setCruError]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    const { start, end } = getCruQueryRange();
    getCruSiteEventsForOrg(cruOrgId, start, end, "pour")
      .then((data) => { if (!cancelled) setCruEvents(data); })
      .catch(() => { if (!cancelled) setCruError(true); })
      .finally(() => { if (!cancelled) setLoadingCru(false); });
    return () => { cancelled = true; };
  }, [cruOrgId]);

  // ── CRU dispatch state (pump/mason requests for CRU events) ──────────────
  const [masonPickerRowId, setMasonPickerRowId] = useState<string | null>(null);
  const [masonQty,         setMasonQty]         = useState(4);
  const [confirmedRows,    setConfirmedRows]     = useState<Record<string, Set<"pump" | "mason">>>({});

  // ── View mode ─────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // ── Inspector state — replaces centered PourDetailModal and inline forms ──
  const [inspectPourId, setInspectPourId] = useState<string | null>(null);

  // ── Create / Edit modal ───────────────────────────────────────────────────
  const [modal, setModal] = useState<ModalState>(null);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const activePours   = pours.filter((p) => p.status !== "Completed" && p.status !== "Canceled");
  const totalYardage  = activePours.reduce((s, p) => s + p.yardage, 0);
  const pendingCount  = pours.filter((p) => p.status === "Pending Approval").length;
  const pumpCount     = activePours.filter((p) => p.pumpRequest.requested).length;
  const conflictCount = pours.filter((p) => p.conflicts && p.status !== "Canceled" && p.status !== "Completed").length;
  const cruCount      = cruEvents.length;

  // ── Pour-linked dispatch requests ─────────────────────────────────────────
  const pourLinkedRequests = useMemo(
    () => requests.filter(
      (r) => r.sourcePourId && (r.type === "pump_truck" || r.type === "mason"),
    ),
    [requests],
  );

  // ── Sorted pours ──────────────────────────────────────────────────────────
  const sortedPours = useMemo(() => {
    return [...pours].sort((a, b) => {
      const aTerminal = a.status === "Completed" || a.status === "Canceled";
      const bTerminal = b.status === "Completed" || b.status === "Canceled";
      if (aTerminal !== bTerminal) return aTerminal ? 1 : -1;
      return a.date.localeCompare(b.date);
    });
  }, [pours]);

  // ── Inspector-derived data ────────────────────────────────────────────────
  const inspectPour     = inspectPourId ? pours.find((p) => p.id === inspectPourId) ?? null : null;
  const inspectRequests = inspectPourId
    ? requests.filter((r) => r.sourcePourId === inspectPourId)
    : [];
  const inspectReadiness = inspectPourId ? pourReadiness.get(inspectPourId) : undefined;

  // ── CRU dispatch helpers ──────────────────────────────────────────────────

  function hasPendingDispatchRequest(jobsite: string, date: string, type: "pump_truck" | "mason"): boolean {
    return requests.some((r) => r.type === type && r.jobsite === jobsite && r.dateNeeded === date);
  }

  function handleRequestPump(jobsite: string, date: string, yardage: number, rowId: string) {
    createRequest({
      type:        "pump_truck",
      jobsite,
      dateNeeded:  date,
      notes:       `Pump truck needed for ${yardage} yd³ pour.`,
      status:      "pending",
      requestedBy: currentOrganization.name,
    });
    markConfirmed(rowId, "pump");
  }

  function handleConfirmMasons(jobsite: string, date: string, yardage: number, rowId: string) {
    createRequest({
      type:           "mason",
      jobsite,
      dateNeeded:     date,
      notes:          `${masonQty} masons requested for pour (${yardage} yd³).`,
      status:         "pending",
      requestedBy:    currentOrganization.name,
      requestedCount: masonQty,
    });
    setMasonPickerRowId(null);
    markConfirmed(rowId, "mason");
  }

  function markConfirmed(rowId: string, type: "pump" | "mason") {
    setConfirmedRows((prev) => {
      const next = new Set(prev[rowId] ?? []) as Set<"pump" | "mason">;
      next.add(type);
      return { ...prev, [rowId]: next };
    });
    setTimeout(() => {
      setConfirmedRows((prev) => {
        const next = new Set(prev[rowId]);
        next.delete(type);
        return { ...prev, [rowId]: next };
      });
    }, 4000);
  }

  // ── Pour workflow handlers ────────────────────────────────────────────────

  function handleSubmitForApproval(id: string) {
    submitPourForApproval(id, role, currentUser.id);
  }

  function handleApprove(id: string) {
    approvePour(id, role, currentUser.id, currentUser.name);
  }

  function handleReject(id: string, reason: string) {
    rejectPour(id, reason, role, currentUser.id, currentUser.name);
  }

  function handleCancel(id: string, reason: string) {
    cancelPour(id, reason, role, currentUser.id, currentUser.name);
  }

  // ── Create / Edit modal handlers ──────────────────────────────────────────

  function handleModalSubmit(input: import("@/lib/ops/types").CreatePourInput, action: PourSaveAction) {
    if (modal?.mode === "edit") {
      if (action === "preserve") {
        editPour(modal.pour.id, input, role, currentUser.id, { preserveStatus: true });
      } else if (action === "submit") {
        editPour(modal.pour.id, input, role, currentUser.id, { submitForApproval: true });
      } else {
        editPour(modal.pour.id, input, role, currentUser.id);
      }
    } else if (modal?.mode === "create") {
      createPour({ ...input, createdBy: currentUser.id, createdByName: currentUser.name }, action === "draft");
    }
    setModal(null);
  }

  const userCanCreate = canCreatePour(role);

  // Open the inspector for a pour (from list row click or calendar click)
  function handlePourClick(pour: PourEvent) {
    setInspectPourId(pour.id);
  }

  // Edit action from inspector
  function handleInspectorEdit() {
    if (!inspectPour) return;
    setInspectPourId(null);
    setModal({ mode: "edit", pour: inspectPour });
  }

  return (
    <PageContainer maxWidth="wide">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/modules/ops"
            className="text-content-muted hover:text-content-primary transition-colors"
            aria-label="Back to OPS"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-content-primary">Pour Schedule</h1>
            <p className="text-xs text-content-muted">
              {loadingCru ? (
                <span className="inline-flex items-center gap-1">
                  <Loader size={10} className="animate-spin" /> Loading CRU events…
                </span>
              ) : cruError ? (
                <>{pours.length} pours · <span className="text-status-warning">CRU unavailable</span></>
              ) : (
                <>
                  {pours.length} pours
                  {cruCount > 0 && <> · <span className="text-gold">{cruCount} from CRU</span></>}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-surface-border overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              aria-label="List view"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "list"
                  ? "bg-surface-overlay text-content-primary"
                  : "text-content-muted hover:text-content-primary"
              }`}
            >
              <List size={13} />
              List
            </button>
            <div className="w-px h-5 bg-surface-border" />
            <button
              onClick={() => setViewMode("calendar")}
              aria-label="Calendar view"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "calendar"
                  ? "bg-surface-overlay text-content-primary"
                  : "text-content-muted hover:text-content-primary"
              }`}
            >
              <Calendar size={13} />
              Calendar
            </button>
          </div>

          {userCanCreate && (
            <button
              onClick={() => setModal({ mode: "create" })}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse transition-colors"
            >
              <Plus size={13} />
              Create Pour
            </button>
          )}
        </div>
      </div>

      {/* ── Summary bar ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1">Upcoming Yardage</p>
          <p className="text-xl font-bold text-content-primary">
            {totalYardage} <span className="text-sm font-normal text-content-muted">yd³</span>
          </p>
        </div>
        <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1">Pump Required</p>
          <p className="text-xl font-bold text-content-primary">
            {pumpCount}<span className="text-sm font-normal text-content-muted"> pours</span>
          </p>
        </div>
        {canApprovePour(role) && (
          <button
            onClick={() => setViewMode("approvals")}
            className={`bg-surface-raised border rounded-[var(--radius-card)] px-4 py-3 text-left w-full transition-colors ${
              pendingCount > 0
                ? "border-status-warning/40 hover:border-status-warning/70"
                : "border-surface-border hover:border-surface-border/70"
            }`}
          >
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
              pendingCount > 0 ? "text-status-warning" : "text-content-muted"
            }`}>Pending Approval</p>
            <p className={`text-xl font-bold ${pendingCount > 0 ? "text-status-warning" : "text-content-primary"}`}>
              {pendingCount}
            </p>
          </button>
        )}
        {conflictCount > 0 && (
          <div className="bg-surface-raised border border-status-warning/30 rounded-[var(--radius-card)] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-status-warning mb-1">Conflicts</p>
            <p className="text-xl font-bold text-status-warning">{conflictCount}</p>
          </div>
        )}
        {opsBlockingMxCount > 0 && (
          <Link
            href="/modules/mx/readiness"
            className="bg-surface-raised border border-status-critical/25 rounded-[var(--radius-card)] px-4 py-3 hover:border-status-critical/50 transition-colors block"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-status-critical mb-1">Project Equipment Risk</p>
            <p className="text-xl font-bold text-status-critical">{opsBlockingMxCount}</p>
            <p className="text-xs text-content-muted mt-0.5">
              blocking MX WO{opsBlockingMxCount !== 1 ? "s" : ""}
            </p>
          </Link>
        )}
      </div>

      {/* ── Approvals View ─────────────────────────────────────────────────── */}
      {viewMode === "approvals" && (
        <PourApprovalsPanel
          pendingPours={pours.filter((p) => p.status === "Pending Approval")}
          pourRequests={pourLinkedRequests}
          allPours={pours}
          role={role}
          userId={currentUser.id}
          userName={currentUser.name}
          cruOrgId={cruOrgId}
          onApprovePour={(id) => approvePour(id, role, currentUser.id, currentUser.name)}
          onRejectPour={(id, reason) => rejectPour(id, reason, role, currentUser.id, currentUser.name)}
          onApproveRequest={approveRequest}
          onAssignRequest={assignRequest}
          mxWorkOrders={mxWorkOrders}
        />
      )}

      {/* ── Calendar View ──────────────────────────────────────────────────── */}
      {viewMode === "calendar" && (
        <div className="mb-6">
          <PourCalendar
            pours={pours}
            requests={requests}
            onPourClick={handlePourClick}
          />
        </div>
      )}

      {/* ── OPS Pour Table (List View) ──────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] overflow-hidden shadow-[var(--shadow-card)] mb-6">
          <div className="px-5 py-3 border-b border-surface-border flex items-center gap-2">
            <span className="text-xs font-bold text-content-primary">OPS Pours</span>
            <span className="text-[10px] font-bold uppercase tracking-widest border border-surface-border bg-surface-overlay text-content-muted rounded-[var(--radius-badge)] px-1.5 py-0.5">
              {pours.length}
            </span>
            <span className="ml-auto text-[10px] text-content-muted">Click a row to review details and actions</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-5 py-3">Location</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Date / Time</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-right text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Yardage</th>
                <th className="text-center text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3 hidden sm:table-cell">Resources</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3 hidden lg:table-cell">Requested By</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Status</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {sortedPours.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-6 text-center text-xs text-content-muted">
                    No pours scheduled yet.
                    {userCanCreate && (
                      <button
                        onClick={() => setModal({ mode: "create" })}
                        className="ml-1 text-gold hover:underline"
                      >
                        Create the first one.
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {sortedPours.map((pour) => {
                const pourRequests  = requests.filter((r) => r.sourcePourId === pour.id);
                const mxReadiness   = pourReadiness.get(pour.id);
                const hasMxRisk     = (mxReadiness?.opsBlockingCount ?? 0) > 0;
                const isSelected    = inspectPourId === pour.id;
                const isTerminal    = pour.status === "Completed" || pour.status === "Canceled";

                return (
                  <tr
                    key={pour.id}
                    onClick={() => handlePourClick(pour)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-gold/5 border-l-2 border-l-gold"
                        : "hover:bg-surface-overlay"
                    }`}
                  >
                    {/* Location */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {pour.conflicts && (
                          <span title="Potential conflict" className="shrink-0">
                            <AlertTriangle size={13} className="text-status-warning" />
                          </span>
                        )}
                        <span className="text-content-primary font-medium text-sm truncate max-w-[180px]">
                          {pour.location}
                        </span>
                      </div>
                      {pour.status === "Rejected" && pour.rejectionReason && (
                        <p className="text-[10px] text-status-error mt-0.5 max-w-[180px] truncate" title={pour.rejectionReason}>
                          Rejected: {pour.rejectionReason}
                        </p>
                      )}
                      {hasMxRisk && (
                        <span
                          className="inline-flex items-center gap-1 mt-1"
                          title="Active OPS-blocking MX work orders at this site"
                        >
                          <Wrench size={10} className="text-status-critical shrink-0" />
                          <span className="text-[10px] font-semibold text-status-critical">
                            {mxReadiness!.opsBlockingCount} blocking MX WO{mxReadiness!.opsBlockingCount !== 1 ? "s" : ""}
                          </span>
                        </span>
                      )}
                    </td>

                    {/* Date / Time */}
                    <td className="px-4 py-3.5 text-content-secondary text-xs whitespace-nowrap">
                      <div>{pour.date}</div>
                      {pour.time && (
                        <div className="flex items-center gap-0.5 text-content-muted mt-0.5">
                          <Clock size={10} />
                          <span>{pour.time}</span>
                        </div>
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3.5 text-content-secondary text-xs hidden md:table-cell">
                      {pour.pourType}
                    </td>

                    {/* Yardage */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-content-primary font-semibold text-sm">{pour.yardage}</span>
                      <span className="text-content-muted text-xs ml-1">yd³</span>
                    </td>

                    {/* Resources */}
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                      <div className="flex items-center justify-center gap-2">
                        {pour.pumpRequest.requested ? (
                          <span title={`Pump: ${pour.pumpRequest.pumpType ?? "TBD"}`}>
                            <Droplets size={14} className="text-gold" />
                          </span>
                        ) : (
                          <Droplets size={14} className="text-surface-border" />
                        )}
                        {pour.masonRequest.requested ? (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-content-secondary"
                            title={`${pour.masonRequest.masonCount ?? "?"} masons`}
                          >
                            <Users size={11} />
                            {pour.masonRequest.masonCount ?? "?"}
                          </span>
                        ) : (
                          <Users size={14} className="text-surface-border" />
                        )}
                      </div>
                    </td>

                    {/* Requested By */}
                    <td className="px-4 py-3.5 text-content-secondary text-xs hidden lg:table-cell">
                      {pour.createdByName}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${POUR_STATUS_BADGE[pour.status]}`}
                      >
                        {pour.status === "Completed" && <CheckCircle size={10} />}
                        {pour.status}
                      </span>
                    </td>

                    {/* Action — single primary action, or open-inspector cue */}
                    <td
                      className="px-4 py-3.5"
                      onClick={(e) => e.stopPropagation()} // prevent double-trigger on button click
                    >
                      {isTerminal ? (
                        <span className="text-xs text-content-muted">—</span>
                      ) : canApprovePour(role) && pour.status === "Pending Approval" ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(pour.id); }}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors whitespace-nowrap"
                        >
                          <CheckCircle size={11} />
                          Approve
                        </button>
                      ) : canSubmitForApproval(role, pour, currentUser.id) ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSubmitForApproval(pour.id); }}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-status-warning/30 text-status-warning hover:bg-status-warning/10 transition-colors whitespace-nowrap"
                        >
                          <ChevronDown size={11} />
                          Submit
                        </button>
                      ) : (
                        <span className="text-[10px] text-content-muted italic">
                          Click to review
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CRU Events Table ───────────────────────────────────────────────── */}
      {(cruEvents.length > 0 || loadingCru) && (
        <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] overflow-hidden shadow-[var(--shadow-card)]">
          <div className="px-5 py-3 border-b border-surface-border flex items-center gap-2">
            <span className="text-xs font-bold text-content-primary">CRU Events</span>
            <span className="text-[10px] font-bold uppercase tracking-widest border border-gold/30 bg-gold/10 text-gold rounded-[var(--radius-badge)] px-1.5 py-0.5">
              CRU
            </span>
            {loadingCru && <Loader size={11} className="animate-spin text-content-muted" />}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-5 py-3">Jobsite</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Date</th>
                <th className="text-right text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Yardage</th>
                <th className="text-center text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Pump</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3 hidden md:table-cell">Crew</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Status</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {cruEvents.map((e) => {
                const rowId      = e.id;
                const jobsite    = e.siteName;
                const isComplete = e.status === "completed";
                return (
                  <tr key={rowId} className="hover:bg-surface-overlay transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-content-primary font-medium text-sm truncate max-w-[180px]">
                        {jobsite}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-content-secondary text-xs">{e.date}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-content-primary font-semibold text-sm">{e.yardage ?? "—"}</span>
                      {e.yardage != null && <span className="text-content-muted text-xs ml-1">yd³</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {e.pumpRequired
                        ? <Droplets size={14} className="text-gold inline-block" />
                        : <span className="text-content-muted text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-content-secondary text-xs hidden md:table-cell">
                      {e.crewName ?? "TBD"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${CRU_STATUS_BADGE[e.status] ?? CRU_STATUS_BADGE.planned}`}>
                        {e.status === "completed" && <CheckCircle size={10} />}
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {isComplete ? (
                        <span className="text-xs text-content-muted">—</span>
                      ) : (
                        <CruDispatchActions
                          rowId={rowId}
                          jobsite={jobsite}
                          date={e.date}
                          yardage={e.yardage ?? 0}
                          pumpRequired={e.pumpRequired ?? false}
                          masonPickerOpen={masonPickerRowId === rowId}
                          masonQty={masonQty}
                          pumpConfirmed={confirmedRows[rowId]?.has("pump") ?? false}
                          masonConfirmed={confirmedRows[rowId]?.has("mason") ?? false}
                          hasPumpRequest={hasPendingDispatchRequest(jobsite, e.date, "pump_truck")}
                          hasMasonRequest={hasPendingDispatchRequest(jobsite, e.date, "mason")}
                          onRequestPump={() => handleRequestPump(jobsite, e.date, e.yardage ?? 0, rowId)}
                          onOpenMasonPicker={() => { setMasonPickerRowId(rowId); setMasonQty(4); }}
                          onMasonQtyChange={setMasonQty}
                          onConfirmMasons={() => handleConfirmMasons(jobsite, e.date, e.yardage ?? 0, rowId)}
                          onCancelMasonPicker={() => setMasonPickerRowId(null)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit modal ───────────────────────────────────────────── */}
      {(modal?.mode === "create" || modal?.mode === "edit") && (
        <CreatePourModal
          initialData={modal.mode === "edit" ? modal.pour : undefined}
          onClose={() => setModal(null)}
          onSubmit={handleModalSubmit}
          role={role}
          userId={currentUser.id}
          orgId={currentOrganization.id}
          availableJobsites={availableJobsites}
        />
      )}

      {/* ── Pour inspector panel ──────────────────────────────────────────── */}
      <PourInspectorPanel
        pour={inspectPour}
        requests={inspectRequests}
        projectReadiness={inspectReadiness}
        role={role}
        userId={currentUser.id}
        onClose={() => setInspectPourId(null)}
        onEdit={handleInspectorEdit}
        onSubmitForApproval={handleSubmitForApproval}
        onApprove={handleApprove}
        onReject={handleReject}
        onCancel={handleCancel}
      />

    </PageContainer>
  );
}

// ── CRU dispatch actions (unchanged from original) ────────────────────────────

interface CruDispatchActionsProps {
  rowId:               string;
  jobsite:             string;
  date:                string;
  yardage:             number;
  pumpRequired:        boolean;
  masonPickerOpen:     boolean;
  masonQty:            number;
  pumpConfirmed:       boolean;
  masonConfirmed:      boolean;
  hasPumpRequest:      boolean;
  hasMasonRequest:     boolean;
  onRequestPump:       () => void;
  onOpenMasonPicker:   () => void;
  onMasonQtyChange:    (v: number) => void;
  onConfirmMasons:     () => void;
  onCancelMasonPicker: () => void;
}

function CruDispatchActions({
  pumpRequired, masonPickerOpen, masonQty, pumpConfirmed, masonConfirmed,
  hasPumpRequest, hasMasonRequest,
  onRequestPump, onOpenMasonPicker, onMasonQtyChange, onConfirmMasons, onCancelMasonPicker,
}: CruDispatchActionsProps) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[140px]">
      {pumpRequired && (
        hasPumpRequest || pumpConfirmed ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gold border border-gold/30 bg-gold/10 rounded-[var(--radius-badge)] px-1.5 py-0.5">
            <CheckCircle size={9} /> Pump requested
          </span>
        ) : (
          <button
            onClick={onRequestPump}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors whitespace-nowrap"
          >
            <Truck size={11} /> Request Pump
          </button>
        )
      )}
      {masonPickerOpen ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <input
            type="number" min={1} max={20} value={masonQty}
            onChange={(e) => onMasonQtyChange(Math.max(1, Math.min(20, Number(e.target.value))))}
            className="w-14 text-xs bg-surface-overlay border border-surface-border rounded-lg px-2 py-1 text-content-primary focus:outline-none focus:border-gold"
          />
          <span className="text-[10px] text-content-muted">masons</span>
          <button
            onClick={onConfirmMasons}
            className="text-xs font-semibold px-2 py-1 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse transition-colors"
          >
            Confirm
          </button>
          <button onClick={onCancelMasonPicker} className="text-xs text-content-muted hover:text-content-primary transition-colors">
            Cancel
          </button>
        </div>
      ) : hasMasonRequest || masonConfirmed ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-status-success border border-status-success/30 bg-status-success/10 rounded-[var(--radius-badge)] px-1.5 py-0.5">
          <CheckCircle size={9} /> Masons requested
        </span>
      ) : (
        <button
          onClick={onOpenMasonPicker}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-surface-border text-content-secondary hover:border-gold/30 hover:text-gold transition-colors whitespace-nowrap"
        >
          <Users size={11} /> Request Masons
        </button>
      )}
    </div>
  );
}
