export type RequestType    = "mason" | "pump_truck" | "equipment" | "manpower";
export type RequestStatus  = "pending" | "approved" | "assigned" | "open" | "closed";
export type ManpowerTrade  = "laborer" | "operator" | "mason" | "carpenter" | "ironworker" | "finisher" | "foreman";

// Legacy — kept for CRU-event display in the pour schedule (CRU has its own
// simplified status model). New OPS pours use PourStatus from pourRules.ts.
export type PourEventStatus = "planned" | "confirmed" | "completed";

export interface Request {
  id:                  string;
  type:                RequestType;
  // Manpower detail (used when type === "manpower")
  trade?:              ManpowerTrade;
  // Equipment detail (used when type === "equipment")
  equipmentType?:      string;
  // How many workers / units needed
  quantity?:           number;
  jobsite:             string;
  jobsiteId?:          string;
  dateNeeded:          string;
  notes?:              string;
  status:              RequestStatus;
  requestedBy?:        string;
  requestedByUserId?:  string;
  // Dispatch assignment (set when closed/assigned)
  assignedTo?:         string;
  assignedFrom?:       string;
  assignedFromCustom?: string;
  assignedAt?:         string;
  assignedBy?:         string;
  // Legacy CRU assignment fields (pour-linked requests only)
  assignedToId?:       string;
  assignedToLabel?:    string;
  assignedToRole?:     string;
  /** Legacy headcount field — use quantity for new requests */
  requestedCount?:     number;
  sourcePourId?:       string;
  /** CX task this request was opened from (CX → OPS link). */
  sourceTaskId?:       string;
  linkedMxWorkOrderId?: string;
}

// ── Pour workflow types ───────────────────────────────────────────────────────

import type { PourStatus, PourType } from "./pourRules";

export interface PumpRequest {
  requested:  boolean;
  pumpType?:  string;
  notes?:     string;
}

export interface MasonRequest {
  requested:   boolean;
  masonCount?: number;
  notes?:      string;
}

export interface PourEvent {
  id:                 string;
  /** Org this pour belongs to — used as scope boundary for Phase 3 RLS. */
  orgId:              string;
  /** Resolved project ID for this jobsite (links to org project list). */
  jobsiteId?:         string;
  /** Display name of the jobsite — derived from the project name at creation time. */
  location:           string;
  date:               string;   // "YYYY-MM-DD"
  time:               string;   // "HH:MM"
  pourType:           PourType;
  yardage:            number;
  estimatedDuration?: string;
  notes?:             string;
  // Planned resource needs
  pumpRequest:        PumpRequest;
  masonRequest:       MasonRequest;
  // Workflow
  status:             PourStatus;
  createdBy:          string;   // user ID
  createdByName:      string;
  requestedAt:        string;   // ISO datetime
  // Approval
  approvedBy?:        string;
  approvedByName?:    string;
  approvedAt?:        string;
  rejectedBy?:        string;
  rejectedByName?:    string;
  rejectionReason?:   string;
  // Cancellation
  canceledBy?:        string;
  canceledByName?:    string;
  canceledAt?:        string;
  cancellationReason?: string;
  // Future-readiness — not wired yet; present for model completeness
  relatedWorkOrderIds:  string[];
  equipmentAssignments: string[];
  /** Reserved: resource clash detection */
  conflicts?:         boolean;
}

/** Input shape for creating a new pour — workflow fields are computed by the service. */
export interface CreatePourInput {
  orgId:             string;
  jobsiteId:         string;
  location:          string;   // display name — derived from the selected jobsite
  date:              string;
  time:              string;
  pourType:          PourType;
  yardage:           number;
  estimatedDuration?: string;
  notes?:            string;
  pumpRequest:       PumpRequest;
  masonRequest:      MasonRequest;
  createdBy:         string;
  createdByName:     string;
}

// Legacy PourEvent shape used by the API-layer service.ts (for the /api/ops/pour-schedule
// route). Kept separately so the API route doesn't need to be changed in Phase 1–2.
export interface LegacyPourEvent {
  id:           string;
  jobsite:      string;
  date:         string;
  yardage:      number;
  pumpRequired: boolean;
  crewRequired: string;
  status:       PourEventStatus;
  conflicts?:   boolean;
}
