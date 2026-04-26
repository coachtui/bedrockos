/**
 * MX Module — Maintenance Execution Domain Types
 *
 * This module is the maintenance execution layer.
 * OPS handles operations planning; MX handles maintenance work.
 *
 * Persistence seam: workOrdersService.ts (localStorage → Supabase)
 */

// ── Status / Priority / Category enums ───────────────────────────────────────

export type MxWorkOrderStatus =
  | "draft"
  | "open"
  | "triage"
  | "approved"
  | "scheduled"
  | "in_progress"
  | "waiting_parts"
  | "blocked"
  | "completed"
  | "canceled";

export type MxWorkOrderPriority = "critical" | "high" | "medium" | "low";

export type MxWorkOrderCategory =
  | "preventive"
  | "corrective"
  | "emergency"
  | "inspection"
  | "modification";

// ── Readiness ─────────────────────────────────────────────────────────────────

/**
 * ReadinessStatus — shared platform concept consumed by OPS and other surfaces.
 * Derived from linked work-order state; can also be manually overridden.
 */
export type ReadinessStatus =
  | "ready"
  | "limited"
  | "at_risk"
  | "scheduled_service"
  | "in_shop"
  | "awaiting_parts"
  | "down";

export interface EquipmentReadiness {
  equipmentId:          string;
  equipmentLabel:       string;
  status:               ReadinessStatus;
  /** Human-readable explanation of current status */
  reason?:              string;
  /** IDs of active work orders that block or constrain this asset */
  blockingWorkOrderIds: string[];
  /** ISO datetime — present when a scheduled return-to-service date is known */
  nextAvailableAt?:     string;
  updatedAt:            string;
}

// ── Core entity ───────────────────────────────────────────────────────────────

export interface MxWorkOrder {
  id:                  string;
  /** WO-XXXX display number */
  woNumber:            string;
  title:               string;
  description?:        string;
  category:            MxWorkOrderCategory;
  priority:            MxWorkOrderPriority;
  status:              MxWorkOrderStatus;
  /** Origin of this work order */
  sourceType?:         "manual" | "inspection" | "alert";
  sourceId?:           string;
  // Equipment link
  equipmentId?:        string;
  equipmentLabel?:     string;
  // Project link
  projectId?:          string;
  projectName?:        string;
  // Requestor
  requestedBy:         string;
  requestedByUserId?:  string;
  requestedDate:       string;   // "YYYY-MM-DD"
  neededByDate?:       string;   // "YYYY-MM-DD"
  requiredSkills?:     string[];
  /** Estimated hours to complete this work order */
  estimatedHours?:     number;
  // Schedule
  scheduledStart?:     string;   // ISO datetime
  scheduledEnd?:       string;   // ISO datetime
  actualStart?:        string;   // ISO datetime — set automatically on → in_progress
  actualEnd?:          string;   // ISO datetime — set automatically on → completed
  // Readiness impact when this WO is open
  readinessImpact:     ReadinessStatus | null;
  /** When true, this WO is blocking OPS operations on the linked equipment */
  opsBlocking:         boolean;
  /** CRU worker IDs assigned to this WO */
  assignedMechanicIds: string[];
  completionNotes?:    string;
  // Audit
  createdAt:           string;   // ISO datetime
  updatedAt:           string;   // ISO datetime
}

/** Input shape for creating a new MX work order.
 *  Workflow fields (id, woNumber, status, createdAt, updatedAt) are computed
 *  by the service. */
export interface CreateMxWorkOrderInput {
  title:               string;
  description?:        string;
  category:            MxWorkOrderCategory;
  priority:            MxWorkOrderPriority;
  equipmentId?:        string;
  equipmentLabel?:     string;
  projectId?:          string;
  projectName?:        string;
  requestedBy:         string;
  requestedByUserId?:  string;
  requestedDate:       string;
  neededByDate?:       string;
  requiredSkills?:     string[];
  estimatedHours?:     number;
  readinessImpact:     ReadinessStatus | null;
  opsBlocking:         boolean;
}

/** Fields that can be patched via updateWorkOrder (outside of status transitions) */
export type MxWorkOrderUpdate = Partial<Pick<MxWorkOrder,
  | "priority"
  | "scheduledStart"
  | "scheduledEnd"
  | "completionNotes"
  | "opsBlocking"
  | "readinessImpact"
>>;

// ── Mechanic assignment ───────────────────────────────────────────────────────

/** Records a specific mechanic assignment to a work order.
 *  Phase 1: embedded as assignedMechanicIds on MxWorkOrder.
 *  Phase 3: promote to its own table for full scheduling data. */
export interface MechanicAssignment {
  id:              string;
  workOrderId:     string;
  mechanicId:      string;
  mechanicName:    string;
  scheduledStart?: string;
  scheduledEnd?:   string;
  assignedAt:      string;
  assignedBy:      string;
}
