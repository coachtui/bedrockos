"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { useOrg } from "@/providers/OrgProvider";
import { useVisibleWorkOrders } from "@/hooks/mx/useVisibleWorkOrders";
import { CreateWorkOrderModal } from "./CreateWorkOrderModal";
import { WoInspectorPanel } from "@/components/mx/WoInspectorPanel";
import {
  STATUS_LABELS, STATUS_BADGE,
  PRIORITY_LABELS, PRIORITY_BADGE,
  CATEGORY_LABELS,
  canCreateWorkOrder,
} from "@/lib/mx/rules";
import type { MxWorkOrderStatus } from "@/lib/mx/types";
import { ArrowLeft, Plus, AlertTriangle, Wrench, User } from "lucide-react";

// ── Filter tabs ───────────────────────────────────────────────────────────────

type FilterGroup = "all" | "active" | "scheduled" | "complete";

const FILTER_GROUPS: Array<{ id: FilterGroup; label: string; statuses?: MxWorkOrderStatus[] }> = [
  { id: "all",       label: "All" },
  { id: "active",    label: "Open / Triage / Approved", statuses: ["draft", "open", "triage", "approved"] },
  { id: "scheduled", label: "Scheduled / In Progress",  statuses: ["scheduled", "in_progress", "waiting_parts", "blocked"] },
  { id: "complete",  label: "Done",                     statuses: ["completed", "canceled"] },
];

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

const URGENCY_DATE_COLOR: Record<Urgency, string> = {
  overdue:  "text-status-critical font-bold",
  today:    "text-gold font-semibold",
  tomorrow: "text-content-secondary",
};

const URGENCY_CHIP: Record<Urgency, string> = {
  overdue:  "text-status-critical bg-status-critical/10 border-status-critical/30",
  today:    "text-gold bg-gold/10 border-gold/30",
  tomorrow: "text-content-secondary bg-surface-border border-surface-border-hover",
};

const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: "Overdue", today: "Today", tomorrow: "Tomorrow",
};

// ── Page ──────────────────────────────────────────────────────────────────────

function MxWorkOrdersContent() {
  const workOrders = useVisibleWorkOrders();
  const { role } = useOrg();
  const canCreate = canCreateWorkOrder(role);

  const searchParams = useSearchParams();

  const [filter,      setFilter]      = useState<FilterGroup>("all");
  const [showCreate,  setShowCreate]  = useState(false);
  const [createdId,   setCreatedId]   = useState<string | null>(null);
  // Inspector state — replaces full-page row navigation
  const [inspectId,   setInspectId]   = useState<string | null>(null);

  // Deep-link from OPS: ?inspect=<woId> opens the inspector immediately
  useEffect(() => {
    const id = searchParams.get("inspect");
    if (id) setInspectId(id);
  }, [searchParams]);

  const group = FILTER_GROUPS.find((g) => g.id === filter)!;
  const visible = group.statuses
    ? workOrders.filter((wo) => group.statuses!.includes(wo.status))
    : workOrders;

  const PRIORITY_WEIGHT: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...visible].sort((a, b) => {
    if (a.opsBlocking !== b.opsBlocking) return a.opsBlocking ? -1 : 1;
    const pd = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (pd !== 0) return pd;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const overdueCount = visible.filter(
    (wo) => getUrgency(wo.neededByDate) === "overdue" && wo.status !== "completed" && wo.status !== "canceled",
  ).length;

  function handleCreated(id: string) {
    setShowCreate(false);
    setCreatedId(id);
    // Open inspector for the newly created WO — keeps user in context
    setInspectId(id);
    setTimeout(() => setCreatedId(null), 3000);
  }

  return (
    <PageContainer maxWidth="wide">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/modules/mx" className="text-content-muted hover:text-content-primary transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-content-primary">Work Orders</h1>
            <p className="text-xs text-content-muted">
              {workOrders.length} total
              {overdueCount > 0 && (
                <span className="ml-2 text-status-critical font-semibold">{overdueCount} overdue</span>
              )}
            </p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal hover:opacity-90 text-white text-xs font-semibold rounded-lg transition-opacity"
          >
            <Plus size={13} /> New Work Order
          </button>
        )}
      </div>

      {/* Created confirmation */}
      {createdId && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-teal/10 border border-teal/30 rounded-lg text-sm text-teal">
          <Wrench size={14} />
          Work order created — reviewing in panel.
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-surface-border">
        {FILTER_GROUPS.map((g) => {
          const count = g.statuses
            ? workOrders.filter((wo) => g.statuses!.includes(wo.status)).length
            : workOrders.length;
          return (
            <button
              key={g.id}
              onClick={() => setFilter(g.id)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px ${
                filter === g.id
                  ? "border-teal text-teal"
                  : "border-transparent text-content-muted hover:text-content-secondary"
              }`}
            >
              {g.label}
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full border ${
                filter === g.id
                  ? "border-teal/30 bg-teal/10"
                  : "border-surface-border bg-surface-overlay"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="border border-dashed border-surface-border rounded-[var(--radius-card)] p-12 text-center">
          <p className="text-sm text-content-muted">No work orders in this view.</p>
          {canCreate && (
            <button onClick={() => setShowCreate(true)} className="mt-3 text-xs text-teal hover:underline">
              Create one →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Column header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-content-muted">
            <div className="col-span-1">WO #</div>
            <div className="col-span-4">Title</div>
            <div className="col-span-2">Equipment</div>
            <div className="col-span-1">Priority</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1">Needed By</div>
            <div className="col-span-1 text-center">Mechs</div>
          </div>

          {sorted.map((wo) => {
            const urgency   = getUrgency(wo.neededByDate);
            const isSelected = inspectId === wo.id;
            return (
              <button
                key={wo.id}
                onClick={() => setInspectId(isSelected ? null : wo.id)}
                className={`w-full grid grid-cols-12 gap-2 items-center px-4 py-3 border rounded-[var(--radius-card)] text-left transition-colors ${
                  isSelected
                    ? "border-teal/40 bg-teal/5"
                    : urgency === "overdue"
                    ? "bg-status-critical/5 border-status-critical/20 hover:border-status-critical/35"
                    : "bg-surface-raised border-surface-border hover:border-teal/30"
                }`}
                aria-pressed={isSelected}
              >
                {/* WO number */}
                <div className="col-span-1">
                  <span className="text-xs font-mono text-content-muted">{wo.woNumber}</span>
                </div>

                {/* Title + category + OPS flag */}
                <div className="col-span-4">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-sm font-semibold text-content-primary leading-snug truncate">{wo.title}</p>
                    {wo.opsBlocking && (
                      <span title="OPS Blocking">
                        <AlertTriangle size={12} className="text-status-critical flex-shrink-0" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-content-muted mt-0.5">{CATEGORY_LABELS[wo.category]}</p>
                </div>

                {/* Equipment */}
                <div className="col-span-2">
                  <p className="text-xs text-content-secondary truncate">
                    {wo.equipmentLabel ?? <span className="text-content-muted">—</span>}
                  </p>
                  {wo.projectName && (
                    <p className="text-[10px] text-content-muted truncate">{wo.projectName}</p>
                  )}
                </div>

                {/* Priority */}
                <div className="col-span-1">
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${PRIORITY_BADGE[wo.priority]}`}>
                    {PRIORITY_LABELS[wo.priority]}
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${STATUS_BADGE[wo.status]}`}>
                    {STATUS_LABELS[wo.status]}
                  </span>
                </div>

                {/* Needed by */}
                <div className="col-span-1">
                  {wo.neededByDate ? (
                    <div>
                      <p className={`text-xs ${urgency ? URGENCY_DATE_COLOR[urgency] : "text-content-secondary"}`}>
                        {wo.neededByDate}
                      </p>
                      {urgency && (
                        <span className={`text-[9px] border rounded px-1 py-0 ${URGENCY_CHIP[urgency]}`}>
                          {URGENCY_LABEL[urgency]}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-content-muted text-xs">—</span>
                  )}
                </div>

                {/* Mechanic count */}
                <div className="col-span-1 flex items-center justify-center gap-1">
                  {wo.assignedMechanicIds.length > 0 ? (
                    <span className="flex items-center gap-0.5 text-[10px] text-content-muted">
                      <User size={10} className="text-teal" />
                      {wo.assignedMechanicIds.length}
                    </span>
                  ) : (
                    <span className="text-[10px] text-content-muted">—</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateWorkOrderModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Inspector panel — right-side detail, stays in context */}
      <WoInspectorPanel
        woId={inspectId}
        onClose={() => setInspectId(null)}
      />

    </PageContainer>
  );
}

export default function MxWorkOrdersPage() {
  return (
    <Suspense>
      <MxWorkOrdersContent />
    </Suspense>
  );
}
