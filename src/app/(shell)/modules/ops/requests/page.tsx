"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, Wrench, CheckCircle2, Clock,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { useOps } from "@/providers/OpsProvider";
import { useOrg } from "@/providers/OrgProvider";
import type { Request as OpsRequest, ManpowerTrade } from "@/lib/ops/types";

// ── Display helpers ───────────────────────────────────────────────────────────

const TRADE_LABELS: Record<ManpowerTrade, string> = {
  laborer:    "Laborer",
  operator:   "Operator",
  mason:      "Mason",
  carpenter:  "Carpenter",
  ironworker: "Ironworker",
  finisher:   "Finisher",
  foreman:    "Foreman",
};

const EQUIPMENT_TYPES = [
  "Excavator", "Compact Excavator", "Pump Truck", "Crane",
  "Skid Steer", "Compactor", "Forklift", "Boom Lift", "Other",
];

function isOpen(r: OpsRequest): boolean {
  return r.status === "open" || r.status === "pending" || r.status === "approved";
}

function requestLabel(r: OpsRequest): string {
  const qty = r.quantity ?? r.requestedCount ?? 1;
  if (r.type === "manpower" && r.trade) {
    const label = TRADE_LABELS[r.trade] ?? r.trade;
    return `${qty} ${label}${qty !== 1 ? "s" : ""}`;
  }
  if (r.type === "equipment" && r.equipmentType) return `${qty}× ${r.equipmentType}`;
  if (r.type === "mason")      return `${qty} Mason${qty !== 1 ? "s" : ""}`;
  if (r.type === "pump_truck") return "Pump Truck";
  if (r.type === "equipment")  return `${qty}× Equipment`;
  return r.type;
}

function requestCategory(r: OpsRequest): "manpower" | "equipment" {
  return (r.type === "manpower" || r.type === "mason") ? "manpower" : "equipment";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

// ── Assign form ───────────────────────────────────────────────────────────────

interface AssignFormProps {
  req:         OpsRequest;
  siteOptions: string[];
  onConfirm:   (to: string, from: string, fromCustom: string) => void;
  onCancel:    () => void;
}

function AssignForm({ req, siteOptions, onConfirm, onCancel }: AssignFormProps) {
  const otherSites = siteOptions.filter((s) => s !== req.jobsite);
  const [assignedTo,   setAssignedTo]   = useState("");
  const [assignedFrom, setAssignedFrom] = useState(otherSites[0] ?? "other");
  const [fromCustom,   setFromCustom]   = useState("");

  const isOther    = assignedFrom === "other";
  const canConfirm = assignedTo.trim() !== "" && (!isOther || fromCustom.trim() !== "");

  return (
    <div className="mt-3 pt-3 border-t border-surface-border space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted">
        Assigning {requestLabel(req)} → {req.jobsite}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-content-muted block mb-1">
            {requestCategory(req) === "manpower" ? "Worker name(s)" : "Unit / description"}
          </label>
          <input
            autoFocus
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder={
              requestCategory(req) === "manpower"
                ? "e.g. Marco Reyes, Luis Torres"
                : "e.g. CAT 308 #04"
            }
            className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-primary placeholder:text-content-muted/50 focus:outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-content-muted block mb-1">
            Pulling from
          </label>
          <select
            value={assignedFrom}
            onChange={(e) => setAssignedFrom(e.target.value)}
            className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-secondary focus:outline-none focus:border-gold cursor-pointer"
          >
            {otherSites.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            <option value="other">Other / Yard / Home</option>
          </select>
        </div>
      </div>

      {isOther && (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-content-muted block mb-1">
            Describe source
          </label>
          <input
            autoFocus
            value={fromCustom}
            onChange={(e) => setFromCustom(e.target.value)}
            placeholder="e.g. Home, bench, subcontractor yard…"
            className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-primary placeholder:text-content-muted/50 focus:outline-none focus:border-gold"
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => onConfirm(assignedTo.trim(), assignedFrom, fromCustom.trim())}
          disabled={!canConfirm}
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse transition-colors disabled:opacity-40"
        >
          Confirm Assignment
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-content-muted hover:text-content-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── New request modal ─────────────────────────────────────────────────────────

interface NewRequestData {
  jobsite:        string;
  category:       "manpower" | "equipment";
  trade?:         ManpowerTrade;
  equipmentType?: string;
  quantity:       number;
  dateNeeded:     string;
  notes:          string;
}

interface NewRequestModalProps {
  sites:    string[];
  onSubmit: (data: NewRequestData) => void;
  onClose:  () => void;
}

function NewRequestModal({ sites, onSubmit, onClose }: NewRequestModalProps) {
  const [jobsite,       setJobsite]       = useState(sites[0] ?? "");
  const [category,      setCategory]      = useState<"manpower" | "equipment">("manpower");
  const [trade,         setTrade]         = useState<ManpowerTrade>("laborer");
  const [equipmentType, setEquipmentType] = useState("Excavator");
  const [quantity,      setQuantity]      = useState(1);
  const [dateNeeded,    setDateNeeded]    = useState("");
  const [notes,         setNotes]         = useState("");

  const canSubmit = jobsite && dateNeeded && quantity > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface-raised border border-surface-border rounded-[var(--radius-card)] p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-content-primary">New Dispatch Request</h2>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-content-muted block mb-1">Jobsite</label>
          <select value={jobsite} onChange={(e) => setJobsite(e.target.value)}
            className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-secondary focus:outline-none focus:border-gold cursor-pointer">
            {sites.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-content-muted block mb-1">Type</label>
          <div className="flex gap-2">
            {(["manpower", "equipment"] as const).map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition-colors ${
                  category === cat
                    ? "border-gold/40 bg-gold/10 text-gold"
                    : "border-surface-border text-content-muted hover:text-content-primary"
                }`}>
                {cat === "manpower" ? "Manpower" : "Equipment"}
              </button>
            ))}
          </div>
        </div>

        {category === "manpower" ? (
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-content-muted block mb-1">Trade</label>
            <select value={trade} onChange={(e) => setTrade(e.target.value as ManpowerTrade)}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-secondary focus:outline-none focus:border-gold cursor-pointer">
              {(Object.keys(TRADE_LABELS) as ManpowerTrade[]).map((t) => (
                <option key={t} value={t}>{TRADE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-content-muted block mb-1">Equipment Type</label>
            <select value={equipmentType} onChange={(e) => setEquipmentType(e.target.value)}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-secondary focus:outline-none focus:border-gold cursor-pointer">
              {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-content-muted block mb-1">
              {category === "manpower" ? "Count" : "Units"}
            </label>
            <input type="number" min={1} max={50} value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-primary focus:outline-none focus:border-gold" />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-content-muted block mb-1">Date Needed</label>
            <input type="date" value={dateNeeded} onChange={(e) => setDateNeeded(e.target.value)}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-secondary focus:outline-none focus:border-gold" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-content-muted block mb-1">
            Notes <span className="normal-case font-normal">(optional)</span>
          </label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Anything dispatch should know…"
            className="w-full text-sm bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-primary placeholder:text-content-muted/50 focus:outline-none focus:border-gold resize-none" />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => {
              if (!canSubmit) return;
              onSubmit({ jobsite, category, trade, equipmentType, quantity, dateNeeded, notes });
            }}
            disabled={!canSubmit}
            className="flex-1 text-sm font-semibold py-2 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse transition-colors disabled:opacity-40"
          >
            Submit Request
          </button>
          <button onClick={onClose}
            className="px-4 text-sm text-content-muted hover:text-content-primary transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RequestsPage() {
  const { requests, assignRequest, createRequest } = useOps();
  const { currentOrganization, currentUser, availableProjects } = useOrg();

  const siteNames = useMemo(
    () => availableProjects.map((p) => p.name),
    [availableProjects],
  );

  const [tab,         setTab]         = useState<"open" | "closed">("open");
  const [filter,      setFilter]      = useState<"all" | "manpower" | "equipment">("all");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [showNew,     setShowNew]     = useState(false);

  // Pour-linked requests belong to the pour schedule — don't show here
  const dispatchRequests = useMemo(
    () => requests.filter((r) => !r.sourcePourId),
    [requests],
  );

  const openCount   = dispatchRequests.filter(isOpen).length;
  const closedCount = dispatchRequests.filter((r) => !isOpen(r)).length;

  const visible = useMemo(() => {
    const byTab = dispatchRequests.filter((r) => tab === "open" ? isOpen(r) : !isOpen(r));
    const byCat = filter === "all" ? byTab : byTab.filter((r) => requestCategory(r) === filter);
    return [...byCat].sort((a, b) => a.dateNeeded.localeCompare(b.dateNeeded));
  }, [dispatchRequests, tab, filter]);

  function handleAssign(req: OpsRequest, to: string, from: string, fromCustom: string) {
    assignRequest(req.id, undefined, {
      assignedTo:         to,
      assignedFrom:       from !== "other" ? from : undefined,
      assignedFromCustom: from === "other" ? fromCustom : undefined,
      assignedBy:         currentUser?.name ?? "Dispatch",
    });
    setAssigningId(null);
  }

  function handleNewRequest(data: NewRequestData) {
    createRequest({
      type:          data.category === "manpower" ? "manpower" : "equipment",
      trade:         data.trade,
      equipmentType: data.equipmentType,
      quantity:      data.quantity,
      jobsite:       data.jobsite,
      dateNeeded:    data.dateNeeded,
      notes:         data.notes,
      status:        "open",
      requestedBy:   currentUser?.name ?? currentOrganization.name,
    });
    setShowNew(false);
  }

  return (
    <PageContainer>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/modules/ops" className="text-content-muted hover:text-content-primary transition-colors" aria-label="Back">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-content-primary">Dispatch Board</h1>
            <p className="text-xs text-content-muted">
              {openCount} open request{openCount !== 1 ? "s" : ""} across all sites
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="text-sm font-semibold bg-gold hover:bg-gold-hover text-content-inverse px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          + New Request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-surface-border">
        {(["open", "closed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setAssigningId(null); }}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-gold text-gold"
                : "border-transparent text-content-muted hover:text-content-primary"
            }`}
          >
            {t === "open" ? "Open" : "Closed"}
            <span className="ml-1.5 text-xs opacity-60">
              ({t === "open" ? openCount : closedCount})
            </span>
          </button>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5">
        {(["all", "manpower", "equipment"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors border ${
              filter === f
                ? "border-gold/40 bg-gold/10 text-gold"
                : "border-surface-border text-content-muted hover:text-content-primary"
            }`}
          >
            {f === "all" ? "All" : f === "manpower" ? "Manpower" : "Equipment"}
          </button>
        ))}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="border border-dashed border-surface-border rounded-[var(--radius-card)] py-12 text-center">
          <p className="text-sm text-content-muted">
            {tab === "open" ? "No open requests" : "No closed requests"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((req) => {
            const isAssigning = assigningId === req.id;
            const isExpanded  = expandedId  === req.id;
            const category    = requestCategory(req);
            const closed      = !isOpen(req);

            return (
              <div
                key={req.id}
                className={`bg-surface-raised border border-surface-border rounded-[var(--radius-card)] px-5 py-4 shadow-[var(--shadow-card)] ${closed ? "opacity-70" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">

                  {/* Icon + details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                      category === "manpower"
                        ? "bg-blue-500/10 border-blue-500/20"
                        : "bg-amber-500/10 border-amber-500/20"
                    }`}>
                      {category === "manpower"
                        ? <Users  size={14} className="text-blue-400" />
                        : <Wrench size={14} className="text-amber-400" />
                      }
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-semibold text-content-primary">
                          {requestLabel(req)}
                        </span>
                        {closed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 text-status-success border-status-success/30 bg-status-success/10">
                            <CheckCircle2 size={9} /> Closed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 text-status-warning border-status-warning/30 bg-status-warning/10">
                            <Clock size={9} /> Open
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-medium text-content-secondary">{req.jobsite}</p>

                      <p className="text-xs text-content-muted mt-0.5">
                        Needed {formatDate(req.dateNeeded)}
                        {req.requestedBy && <> · {req.requestedBy}</>}
                      </p>

                      {req.notes && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : req.id)}
                          className="flex items-center gap-1 text-[10px] text-content-muted hover:text-content-primary mt-1.5 transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          {isExpanded ? "Hide notes" : "Notes"}
                        </button>
                      )}
                      {isExpanded && req.notes && (
                        <p className="text-xs text-content-muted mt-1.5 italic leading-relaxed">
                          {req.notes}
                        </p>
                      )}

                      {/* Closed: assignment summary */}
                      {closed && (req.assignedTo || req.assignedToLabel) && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-xs text-status-success font-medium">
                            → {req.assignedTo ?? req.assignedToLabel}
                          </span>
                          {(req.assignedFrom || req.assignedFromCustom) && (
                            <span className="text-xs text-content-muted">
                              from {req.assignedFrom ?? req.assignedFromCustom}
                            </span>
                          )}
                          {req.assignedAt && (
                            <span className="text-[10px] text-content-muted">
                              · {formatDateTime(req.assignedAt)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assign button */}
                  {!closed && !isAssigning && (
                    <button
                      onClick={() => { setAssigningId(req.id); setExpandedId(null); }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse transition-colors shrink-0"
                    >
                      Assign →
                    </button>
                  )}
                </div>

                {/* Inline assign form */}
                {isAssigning && (
                  <AssignForm
                    req={req}
                    siteOptions={siteNames}
                    onConfirm={(to, from, fromCustom) => handleAssign(req, to, from, fromCustom)}
                    onCancel={() => setAssigningId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New request modal */}
      {showNew && (
        <NewRequestModal
          sites={siteNames}
          onSubmit={handleNewRequest}
          onClose={() => setShowNew(false)}
        />
      )}

    </PageContainer>
  );
}
