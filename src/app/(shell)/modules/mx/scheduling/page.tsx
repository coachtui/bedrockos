"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { useMx } from "@/providers/MxProvider";
import { useOrg } from "@/providers/OrgProvider";
import { useVisibleWorkOrders } from "@/hooks/mx/useVisibleWorkOrders";
import { getOrgMechanicsAndDrivers } from "@/lib/registry";
import type { OrgWorker } from "@/types/domain";
import {
  STATUS_LABELS, STATUS_BADGE,
  PRIORITY_LABELS, PRIORITY_BADGE,
  WO_TRANSITIONS,
  canAssignMechanic, canUpdateWorkOrderStatus,
  ACTIVE_STATUSES,
} from "@/lib/mx/rules";
import type { MxWorkOrder, MxWorkOrderStatus } from "@/lib/mx/types";
import { WoInspectorPanel } from "@/components/mx/WoInspectorPanel";
import {
  ArrowLeft, User, CalendarDays, AlertTriangle,
  Inbox, Wrench, Clock, PackageX, Play, CheckCircle2,
  XCircle, RotateCcw, X as XIcon, Send, CheckCheck,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

function sortQueue(wos: MxWorkOrder[]): MxWorkOrder[] {
  return [...wos].sort((a, b) => {
    if (a.opsBlocking !== b.opsBlocking) return a.opsBlocking ? -1 : 1;
    const pw = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (pw !== 0) return pw;
    if (a.neededByDate && b.neededByDate) return a.neededByDate.localeCompare(b.neededByDate);
    if (a.neededByDate) return -1;
    if (b.neededByDate) return 1;
    return 0;
  });
}

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

const URGENCY_CHIP: Record<Urgency, string> = {
  overdue:  "text-status-critical bg-status-critical/10 border-status-critical/30 font-bold",
  today:    "text-gold bg-gold/10 border-gold/30 font-semibold",
  tomorrow: "text-content-secondary bg-surface-border border-surface-border-hover",
};

const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: "Overdue", today: "Due Today", tomorrow: "Tomorrow",
};

const URGENCY_DATE_COLOR: Record<Urgency, string> = {
  overdue:  "text-status-critical font-semibold",
  today:    "text-gold font-semibold",
  tomorrow: "text-content-muted",
};

// Quick action definitions (subset relevant to scheduling board)
type ActionDef = { label: string; status: MxWorkOrderStatus; style: string; icon: React.ReactNode };

function getLaneActions(status: MxWorkOrderStatus): ActionDef[] {
  const allowed = WO_TRANSITIONS[status];
  const defs: ActionDef[] = [
    { label: "Start",    status: "in_progress",   style: "bg-teal text-white border-teal hover:opacity-90",                          icon: <Play size={9} /> },
    { label: "Resume",   status: "in_progress",   style: "bg-teal text-white border-teal hover:opacity-90",                          icon: <RotateCcw size={9} /> },
    { label: "Parts",    status: "waiting_parts", style: "border-gold/40 text-gold hover:bg-gold/10",                               icon: <PackageX size={9} /> },
    { label: "Blocked",  status: "blocked",       style: "border-status-critical/30 text-status-critical hover:bg-status-critical/10", icon: <XCircle size={9} /> },
    { label: "Complete", status: "completed",     style: "bg-teal text-white border-teal hover:opacity-90",               icon: <CheckCircle2 size={9} /> },
  ];
  return defs.filter((d) => allowed.includes(d.status));
}

// ── Queue Card ────────────────────────────────────────────────────────────────

function QueueCard({
  wo,
  canAssign,
  isDragging,
  onDragStart,
  onDragEnd,
  onInspect,
}: {
  wo:          MxWorkOrder;
  canAssign:   boolean;
  isDragging:  boolean;
  onDragStart: () => void;
  onDragEnd:   () => void;
  onInspect:   (woId: string) => void;
}) {
  const urgency = getUrgency(wo.neededByDate);

  return (
    <div
      draggable={canAssign}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-surface-raised border rounded-[var(--radius-card)] p-3 shadow-[var(--shadow-card)] ${
        isDragging
          ? "border-teal/50 opacity-50"
          : urgency === "overdue"
          ? "border-status-critical/25 hover:border-status-critical/40"
          : "border-surface-border hover:border-teal/25"
      } ${canAssign ? "cursor-grab active:cursor-grabbing" : ""} transition-colors`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap gap-1">
          <span className={`text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${PRIORITY_BADGE[wo.priority]}`}>
            {PRIORITY_LABELS[wo.priority]}
          </span>
          {urgency && (
            <span className={`text-[10px] border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${URGENCY_CHIP[urgency]}`}>
              {URGENCY_LABEL[urgency]}
            </span>
          )}
          {wo.opsBlocking && (
            <span className="flex items-center gap-0.5 text-[10px] text-status-critical font-semibold">
              <AlertTriangle size={10} /> OPS
            </span>
          )}
        </div>
        <span className={`text-[10px] font-semibold border rounded-[var(--radius-badge)] px-1.5 py-0.5 flex-shrink-0 ${STATUS_BADGE[wo.status]}`}>
          {STATUS_LABELS[wo.status]}
        </span>
      </div>

      {/* Title — opens inspector instead of navigating */}
      <button
        onClick={() => onInspect(wo.id)}
        className="block text-left hover:underline w-full"
      >
        <p className="text-xs font-semibold text-content-primary leading-snug">{wo.title}</p>
      </button>
      {wo.description && (
        <p className="text-[10px] text-content-secondary mt-0.5 leading-snug line-clamp-1">{wo.description}</p>
      )}
      {wo.equipmentLabel && (
        <p className="text-[10px] text-content-muted mt-1">{wo.equipmentLabel}</p>
      )}
      {wo.neededByDate && (
        <div className="flex items-center gap-1 mt-1.5">
          <CalendarDays size={10} className="text-content-muted" />
          <p className={`text-[10px] ${urgency ? URGENCY_DATE_COLOR[urgency] : "text-content-muted"}`}>
            Needed {wo.neededByDate}
          </p>
        </div>
      )}
      {canAssign && (
        <p className="text-[10px] text-content-muted mt-2 italic">Drag to assign →</p>
      )}
    </div>
  );
}

// ── Mechanic Lane Item ────────────────────────────────────────────────────────

const NOTE_STATUSES = new Set<MxWorkOrderStatus>(["waiting_parts", "blocked"]);

const NOTE_PLACEHOLDER: Partial<Record<MxWorkOrderStatus, string>> = {
  waiting_parts: "What parts are needed?",
  blocked:       "What is blocking this work?",
};

function LaneItem({
  wo,
  mechanicId,
  canAssign,
  canAct,
  onUnassign,
  onAction,
  onNote,
  onInspect,
}: {
  wo:         MxWorkOrder;
  mechanicId: string;
  canAssign:  boolean;
  canAct:     boolean;
  onUnassign: (woId: string, mechanicId: string) => void;
  onAction:   (woId: string, status: MxWorkOrderStatus) => void;
  onNote:     (woId: string, note: string) => void;
  onInspect:  (woId: string) => void;
}) {
  const urgency = getUrgency(wo.neededByDate);
  const actions = canAct ? getLaneActions(wo.status) : [];

  const [pendingStatus, setPendingStatus] = useState<MxWorkOrderStatus | null>(null);
  const [noteText,      setNoteText]      = useState("");

  function handleActionClick(status: MxWorkOrderStatus) {
    if (NOTE_STATUSES.has(status)) {
      setPendingStatus(status);
      setNoteText("");
    } else {
      onAction(wo.id, status);
    }
  }

  function confirmPending() {
    if (!pendingStatus) return;
    if (noteText.trim()) onNote(wo.id, noteText.trim());
    onAction(wo.id, pendingStatus);
    setPendingStatus(null);
    setNoteText("");
  }

  function cancelPending() {
    setPendingStatus(null);
    setNoteText("");
  }

  return (
    <div className={`bg-surface-overlay border rounded-lg transition-colors ${
      urgency === "overdue" ? "border-status-critical/20" : "border-surface-border"
    }`}>
      {/* Header row */}
      <div className="flex items-start gap-2 px-2.5 py-2">
        <span className={`mt-0.5 flex-shrink-0 text-[9px] font-bold uppercase tracking-widest border rounded px-1 py-0.5 ${STATUS_BADGE[wo.status]}`}>
          {STATUS_LABELS[wo.status]}
        </span>
        <div className="min-w-0 flex-1">
          {/* Title — opens inspector instead of navigating */}
          <button
            onClick={() => onInspect(wo.id)}
            className="block text-left hover:underline w-full"
          >
            <p className="text-[11px] font-semibold text-content-primary leading-snug truncate">{wo.title}</p>
          </button>
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            {wo.equipmentLabel && (
              <p className="text-[10px] text-content-muted truncate">{wo.equipmentLabel}</p>
            )}
            {urgency && (
              <span className={`text-[9px] border rounded px-1 py-0 ${URGENCY_CHIP[urgency]}`}>
                {URGENCY_LABEL[urgency]}
              </span>
            )}
            {wo.opsBlocking && (
              <AlertTriangle size={10} className="text-status-critical flex-shrink-0" />
            )}
          </div>
          {/* Saved note preview */}
          {!pendingStatus && wo.completionNotes && (wo.status === "waiting_parts" || wo.status === "blocked") && (
            <p className="text-[10px] text-content-muted italic mt-0.5 truncate" title={wo.completionNotes}>
              Note: {wo.completionNotes}
            </p>
          )}
        </div>
        {canAssign && !pendingStatus && (
          <button
            onClick={() => onUnassign(wo.id, mechanicId)}
            className="flex-shrink-0 p-0.5 rounded hover:bg-surface-border text-content-muted hover:text-content-primary transition-colors mt-0.5"
            title="Unassign"
          >
            <XIcon size={11} />
          </button>
        )}
      </div>

      {/* Inline note prompt */}
      {pendingStatus && (
        <div className="px-2.5 pb-2 border-t border-surface-border pt-2 space-y-1.5">
          <p className="text-[10px] font-semibold text-content-muted uppercase tracking-widest">
            {STATUS_LABELS[pendingStatus]}
          </p>
          <textarea
            autoFocus
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={NOTE_PLACEHOLDER[pendingStatus] ?? "Optional note…"}
            rows={2}
            className="w-full text-[11px] bg-surface-raised border border-surface-border rounded px-2 py-1.5 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-teal resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) confirmPending();
              if (e.key === "Escape") cancelPending();
            }}
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={confirmPending}
              className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold bg-teal text-white border border-teal rounded hover:opacity-90 transition-opacity"
            >
              <Send size={9} /> Confirm
            </button>
            <button
              onClick={cancelPending}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-content-muted border border-surface-border rounded hover:bg-surface-border transition-colors"
            >
              <XIcon size={9} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quick actions (hidden while note prompt open) */}
      {!pendingStatus && actions.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2.5 pb-2 border-t border-surface-border pt-1.5">
          {actions.map((action) => (
            <button
              key={`${action.status}-${action.label}`}
              onClick={() => handleActionClick(action.status)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold border rounded transition-colors ${action.style}`}
            >
              {action.icon} {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lane Section ──────────────────────────────────────────────────────────────

function Lane({
  icon,
  label,
  wos,
  mechanicId,
  canAssign,
  canAct,
  isDropTarget,
  onUnassign,
  onAction,
  onNote,
  onInspect,
}: {
  icon:          React.ReactNode;
  label:         string;
  wos:           MxWorkOrder[];
  mechanicId:    string;
  canAssign:     boolean;
  canAct:        boolean;
  isDropTarget?: boolean;
  onUnassign:    (woId: string, mechanicId: string) => void;
  onAction:      (woId: string, status: MxWorkOrderStatus) => void;
  onNote:        (woId: string, note: string) => void;
  onInspect:     (woId: string) => void;
}) {
  if (wos.length === 0 && !isDropTarget) return null;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest text-content-muted">{label}</span>
        <span className="ml-auto text-[10px] text-content-muted">{wos.length}</span>
      </div>
      {wos.length === 0 ? (
        <div className={`rounded-lg border border-dashed p-2.5 text-center ${isDropTarget ? "border-teal/40" : "border-surface-border"}`}>
          <p className="text-[10px] text-content-muted">{isDropTarget ? "Drop to assign" : "None"}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {wos.map((wo) => (
            <LaneItem
              key={wo.id}
              wo={wo}
              mechanicId={mechanicId}
              canAssign={canAssign}
              canAct={canAct}
              onUnassign={onUnassign}
              onAction={onAction}
              onNote={onNote}
              onInspect={onInspect}
            />
          ))}
          {isDropTarget && (
            <div className="rounded-lg border border-dashed border-teal/40 p-2 text-center">
              <p className="text-[10px] text-teal">+ Drop to assign</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MxSchedulingPage() {
  const { assignMechanic, unassignMechanic, updateWorkOrderStatus, updateWorkOrder } = useMx();
  const workOrders = useVisibleWorkOrders();
  const { currentOrganization, role } = useOrg();

  const [mechanics,    setMechanics]    = useState<OrgWorker[]>([]);
  const [loadingMechs, setLoadingMechs] = useState(true);
  const [draggedWoId,  setDraggedWoId]  = useState<string | null>(null);
  const [pendingAssign, setPendingAssign] = useState<{ woId: string; mechanicId: string } | null>(null);
  // Inspector — WO detail panel without leaving the board
  const [inspectId,    setInspectId]    = useState<string | null>(null);

  const canAssign = canAssignMechanic(role);
  const canAct    = canUpdateWorkOrderStatus(role);

  useEffect(() => {
    getOrgMechanicsAndDrivers(currentOrganization.id)
      .then(setMechanics)
      .finally(() => setLoadingMechs(false));
  }, [currentOrganization.id]);

  // Unassigned active WOs — sorted: OPS-blocking → priority → neededByDate
  const unassigned = useMemo(
    () => sortQueue(
      workOrders.filter(
        (wo) =>
          ACTIVE_STATUSES.includes(wo.status) &&
          wo.assignedMechanicIds.length === 0 &&
          wo.status !== "waiting_parts",
      ),
    ),
    [workOrders],
  );

  // Waiting parts — unassigned, shown separately
  const waitingPartsUnassigned = useMemo(
    () => workOrders.filter(
      (wo) => wo.status === "waiting_parts" && wo.assignedMechanicIds.length === 0,
    ),
    [workOrders],
  );

  const mechanicList = mechanics.filter((m) => m.role === "mechanic");

  function lanesForMechanic(mechanicId: string) {
    const all = workOrders.filter(
      (wo) => ACTIVE_STATUSES.includes(wo.status) && wo.assignedMechanicIds.includes(mechanicId),
    );
    return {
      inProgress:   sortQueue(all.filter((wo) => wo.status === "in_progress")),
      scheduled:    sortQueue(all.filter((wo) => wo.status === "scheduled")),
      queued:       sortQueue(all.filter((wo) => ["open", "triage", "approved"].includes(wo.status))),
      waitingParts: all.filter((wo) => wo.status === "waiting_parts"),
      blocked:      all.filter((wo) => wo.status === "blocked"),
    };
  }

  function handleDrop(mechanicId: string) {
    if (!draggedWoId || !canAssign) return;
    setPendingAssign({ woId: draggedWoId, mechanicId });
    setDraggedWoId(null);
  }

  function confirmAssign() {
    if (!pendingAssign) return;
    assignMechanic(pendingAssign.woId, pendingAssign.mechanicId);
    setPendingAssign(null);
  }

  function cancelAssign() {
    setPendingAssign(null);
  }

  function handleUnassign(woId: string, mechanicId: string) {
    if (canAssign) unassignMechanic(woId, mechanicId);
  }

  function handleAction(woId: string, status: MxWorkOrderStatus) {
    if (canAct) updateWorkOrderStatus(woId, status);
  }

  function handleNote(woId: string, note: string) {
    updateWorkOrder(woId, { completionNotes: note });
  }

  const totalAssigned = useMemo(
    () => workOrders.filter(
      (wo) => ACTIVE_STATUSES.includes(wo.status) && wo.assignedMechanicIds.length > 0,
    ).length,
    [workOrders],
  );

  return (
    <PageContainer maxWidth="wide">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/modules/mx" className="text-content-muted hover:text-content-primary transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-content-primary">Mechanic Scheduling</h1>
          <p className="text-xs text-content-muted">
            {unassigned.length} unassigned · {totalAssigned} assigned · {mechanicList.length} mechanics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Unassigned Queue ──────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-5">

          {/* Main queue */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Inbox size={13} className="text-content-muted" />
              <span className="text-xs font-bold uppercase tracking-widest text-content-muted">Unassigned Queue</span>
              <span className="ml-auto text-[10px] font-bold text-content-muted bg-surface-overlay border border-surface-border rounded-full px-1.5 py-0.5">
                {unassigned.length}
              </span>
            </div>

            {unassigned.length === 0 ? (
              <div className="border border-dashed border-surface-border rounded-[var(--radius-card)] p-6 text-center">
                <p className="text-xs text-content-muted">All active WOs are assigned.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {unassigned.map((wo) => (
                  <QueueCard
                    key={wo.id}
                    wo={wo}
                    canAssign={canAssign}
                    isDragging={draggedWoId === wo.id}
                    onDragStart={() => setDraggedWoId(wo.id)}
                    onDragEnd={() => setDraggedWoId(null)}
                    onInspect={setInspectId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Waiting Parts — unassigned, clearly excluded from workload */}
          {waitingPartsUnassigned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PackageX size={13} className="text-gold" />
                <span className="text-xs font-bold uppercase tracking-widest text-gold">Waiting Parts</span>
                <span className="ml-auto text-[10px] font-bold text-gold bg-gold/10 border border-gold/30 rounded-full px-1.5 py-0.5">
                  {waitingPartsUnassigned.length}
                </span>
              </div>
              <div className="space-y-2">
                {waitingPartsUnassigned.map((wo) => (
                  <QueueCard
                    key={wo.id}
                    wo={wo}
                    canAssign={false}
                    isDragging={false}
                    onDragStart={() => {}}
                    onDragEnd={() => {}}
                    onInspect={setInspectId}
                  />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ── Right: Mechanic Boards ──────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <User size={13} className="text-content-muted" />
            <span className="text-xs font-bold uppercase tracking-widest text-content-muted">Mechanics</span>
          </div>

          {loadingMechs ? (
            <div className="border border-dashed border-surface-border rounded-[var(--radius-card)] p-8 text-center">
              <p className="text-xs text-content-muted">Loading mechanics…</p>
            </div>
          ) : mechanicList.length === 0 ? (
            <div className="border border-dashed border-surface-border rounded-[var(--radius-card)] p-8 text-center">
              <p className="text-xs text-content-muted">No mechanics found in CRU.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mechanicList.map((mechanic) => {
                const lanes    = lanesForMechanic(mechanic.id);
                const total    = lanes.inProgress.length + lanes.scheduled.length + lanes.queued.length + lanes.waitingParts.length + lanes.blocked.length;
                const isTarget = draggedWoId !== null && canAssign;

                return (
                  <div
                    key={mechanic.id}
                    onDragOver={(e) => { if (canAssign) e.preventDefault(); }}
                    onDrop={() => handleDrop(mechanic.id)}
                    className={`border rounded-[var(--radius-card)] p-3 transition-colors ${
                      isTarget
                        ? "border-teal/50 bg-teal/5"
                        : "border-surface-border bg-surface-raised"
                    }`}
                  >
                    {/* Mechanic header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        mechanic.available
                          ? "bg-teal/15 border border-teal/30"
                          : "bg-surface-overlay border border-surface-border"
                      }`}>
                        <User size={12} className={mechanic.available ? "text-teal" : "text-content-muted"} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-content-primary truncate">{mechanic.name}</p>
                        <p className="text-[10px] text-content-muted">
                          {mechanic.available ? "Available" : "Unavailable"}
                          {mechanic.siteName && ` · ${mechanic.siteName}`}
                        </p>
                      </div>
                      <span className="ml-auto text-[10px] font-bold text-content-muted bg-surface-overlay border border-surface-border rounded-full px-1.5 py-0.5 flex-shrink-0">
                        {total}
                      </span>
                    </div>

                    {/* Lanes */}
                    <div className="space-y-3">
                      <Lane
                        icon={<Wrench size={10} className="text-status-info" />}
                        label="In Progress"
                        wos={lanes.inProgress}
                        mechanicId={mechanic.id}
                        canAssign={canAssign}
                        canAct={canAct}
                        isDropTarget={isTarget && lanes.inProgress.length === 0}
                        onUnassign={handleUnassign}
                        onAction={handleAction}
                        onNote={handleNote}
                        onInspect={setInspectId}
                      />
                      <Lane
                        icon={<Clock size={10} className="text-teal" />}
                        label="Scheduled"
                        wos={lanes.scheduled}
                        mechanicId={mechanic.id}
                        canAssign={canAssign}
                        canAct={canAct}
                        onUnassign={handleUnassign}
                        onAction={handleAction}
                        onNote={handleNote}
                        onInspect={setInspectId}
                      />
                      <Lane
                        icon={<Inbox size={10} className="text-content-muted" />}
                        label="Queued"
                        wos={lanes.queued}
                        mechanicId={mechanic.id}
                        canAssign={canAssign}
                        canAct={canAct}
                        isDropTarget={isTarget && lanes.inProgress.length > 0}
                        onUnassign={handleUnassign}
                        onAction={handleAction}
                        onNote={handleNote}
                        onInspect={setInspectId}
                      />
                      {lanes.waitingParts.length > 0 && (
                        <Lane
                          icon={<PackageX size={10} className="text-gold" />}
                          label="Waiting Parts"
                          wos={lanes.waitingParts}
                          mechanicId={mechanic.id}
                          canAssign={canAssign}
                          canAct={canAct}
                          onUnassign={handleUnassign}
                          onAction={handleAction}
                          onNote={handleNote}
                          onInspect={setInspectId}
                        />
                      )}
                      {lanes.blocked.length > 0 && (
                        <Lane
                          icon={<AlertTriangle size={10} className="text-status-critical" />}
                          label="Blocked"
                          wos={lanes.blocked}
                          mechanicId={mechanic.id}
                          canAssign={canAssign}
                          canAct={canAct}
                          onUnassign={handleUnassign}
                          onAction={handleAction}
                          onNote={handleNote}
                          onInspect={setInspectId}
                        />
                      )}
                      {total === 0 && (
                        <div className={`rounded-lg border border-dashed p-3 text-center ${
                          isTarget ? "border-teal/40" : "border-surface-border"
                        }`}>
                          <p className="text-[10px] text-content-muted">
                            {isTarget ? "Drop to assign" : "No active WOs"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Assign confirmation dialog */}
      {pendingAssign && (() => {
        const wo       = workOrders.find((w) => w.id === pendingAssign.woId);
        const mechanic = mechanicList.find((m) => m.id === pendingAssign.mechanicId);
        if (!wo || !mechanic) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] shadow-2xl w-full max-w-sm mx-4 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-teal" />
                </div>
                <div>
                  <p className="text-sm font-bold text-content-primary">Assign Work Order</p>
                  <p className="text-[10px] text-content-muted">Confirm before assigning</p>
                </div>
                <button
                  onClick={cancelAssign}
                  className="ml-auto p-1 rounded hover:bg-surface-border text-content-muted transition-colors"
                >
                  <XIcon size={13} />
                </button>
              </div>

              <div className="bg-surface-overlay border border-surface-border rounded-lg p-3 mb-4 space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-content-muted w-16 flex-shrink-0 pt-0.5">WO</span>
                  <p className="text-xs font-semibold text-content-primary leading-snug">{wo.title}</p>
                </div>
                {wo.equipmentLabel && (
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-content-muted w-16 flex-shrink-0 pt-0.5">Equipment</span>
                    <p className="text-[11px] text-content-secondary">{wo.equipmentLabel}</p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-[10px] text-content-muted w-16 flex-shrink-0 pt-0.5">Assign to</span>
                  <p className="text-[11px] font-semibold text-teal">{mechanic.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={confirmAssign}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-teal text-white border border-teal rounded-lg hover:opacity-90 transition-opacity"
                >
                  <CheckCheck size={12} /> Confirm Assignment
                </button>
                <button
                  onClick={cancelAssign}
                  className="px-3 py-2 text-xs text-content-muted border border-surface-border rounded-lg hover:bg-surface-border transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Inspector panel — stays over board without losing context */}
      <WoInspectorPanel
        woId={inspectId}
        onClose={() => setInspectId(null)}
      />

    </PageContainer>
  );
}
