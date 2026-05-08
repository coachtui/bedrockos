/**
 * pourRules — canonical business rules for the pour workflow.
 *
 * Centralises:
 *   - status enum + valid transitions
 *   - pour type enum
 *   - approval / cancellation / edit permission helpers
 *   - status badge display map
 *
 * Imported by both the service layer (enforcement) and the UI layer (gating).
 * No React, no side-effects, no imports from other OPS modules.
 */

import type { UserRole } from "@/types/org";

// ── Status ────────────────────────────────────────────────────────────────────

export const POUR_STATUS = {
  DRAFT:            "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED:         "Approved",
  REJECTED:         "Rejected",
  CANCELED:         "Canceled",
  IN_PROGRESS:      "In Progress",
  COMPLETED:        "Completed",
} as const;

export type PourStatus = typeof POUR_STATUS[keyof typeof POUR_STATUS];

// ── Pour type ─────────────────────────────────────────────────────────────────

export const POUR_TYPE = {
  FOUNDATION: "Foundation",
  SLAB:       "Slab",
  COLUMN:     "Column",
  WALL:       "Wall",
  BEAM:       "Beam",
  DECK:       "Deck",
  OTHER:      "Other",
} as const;

export type PourType = typeof POUR_TYPE[keyof typeof POUR_TYPE];

export const POUR_TYPE_OPTIONS: PourType[] = Object.values(POUR_TYPE);

// ── Valid status transitions ───────────────────────────────────────────────────

export const POUR_STATUS_TRANSITIONS: Record<PourStatus, PourStatus[]> = {
  "Draft":            ["Pending Approval", "Canceled"],
  "Pending Approval": ["Approved", "Rejected", "Canceled"],
  "Approved":         ["In Progress", "Canceled"],
  "Rejected":         ["Pending Approval", "Canceled"],
  "In Progress":      ["Completed", "Canceled"],
  "Canceled":         [],
  "Completed":        [],
};

export function isValidTransition(from: PourStatus, to: PourStatus): boolean {
  return POUR_STATUS_TRANSITIONS[from].includes(to);
}

// ── Role sets ─────────────────────────────────────────────────────────────────

// These are the only places where "who can do what" is defined.

const CREATOR_ROLES: readonly UserRole[] = [
  "owner", "admin", "equipment_director", "operations_manager",
  "pm", "project_engineer", "superintendent", "foreman",
];

const APPROVER_ROLES: readonly UserRole[] = ["owner", "admin", "equipment_director", "operations_manager"];

const ADMIN_ROLES: readonly UserRole[] = ["owner", "admin", "equipment_director", "operations_manager"];

export function isAdminRole(role: UserRole): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

// ── Permission helpers ────────────────────────────────────────────────────────

export function canCreatePour(role: UserRole): boolean {
  return (CREATOR_ROLES as readonly string[]).includes(role);
}

export function canApprovePour(role: UserRole): boolean {
  return (APPROVER_ROLES as readonly string[]).includes(role);
}

/**
 * Cancellation rules:
 *  - Completed pours: no one
 *  - Canceled pours: already done
 *  - In Progress: admin only
 *  - Everything else: admin OR original creator (Draft / Pending / Approved)
 */
export function canCancelPour(
  role: UserRole,
  pour: { status: PourStatus; createdBy: string },
  userId: string,
): boolean {
  if (pour.status === POUR_STATUS.COMPLETED) return false;
  if (pour.status === POUR_STATUS.CANCELED)  return false;
  if (pour.status === POUR_STATUS.IN_PROGRESS) return isAdminRole(role);
  if (isAdminRole(role)) return true;
  const ownCancelable: PourStatus[] = [
    POUR_STATUS.DRAFT,
    POUR_STATUS.PENDING_APPROVAL,
    POUR_STATUS.APPROVED,
  ];
  return pour.createdBy === userId && ownCancelable.includes(pour.status);
}

/**
 * Edit rules:
 *  - Completed / In Progress / Canceled: nobody
 *  - Admin: any other status
 *  - Others: own Draft, Rejected, OR Approved pours
 *    (editing an Approved pour as a non-admin triggers re-approval — enforced in the service)
 */
export function canEditPour(
  role: UserRole,
  pour: { status: PourStatus; createdBy: string },
  userId: string,
): boolean {
  const locked: PourStatus[] = [POUR_STATUS.COMPLETED, POUR_STATUS.IN_PROGRESS, POUR_STATUS.CANCELED];
  if (locked.includes(pour.status)) return false;
  if (isAdminRole(role)) return true;
  const ownEditable: PourStatus[] = [POUR_STATUS.DRAFT, POUR_STATUS.REJECTED, POUR_STATUS.APPROVED];
  return pour.createdBy === userId && ownEditable.includes(pour.status);
}

/**
 * Submit for approval: Draft or Rejected → Pending Approval.
 * Available to the original creator and admins.
 */
export function canSubmitForApproval(
  role: UserRole,
  pour: { status: PourStatus; createdBy: string },
  userId: string,
): boolean {
  const submittable: PourStatus[] = [POUR_STATUS.DRAFT, POUR_STATUS.REJECTED];
  if (!submittable.includes(pour.status)) return false;
  return pour.createdBy === userId || isAdminRole(role);
}

// ── Status badge styles ───────────────────────────────────────────────────────

export const POUR_STATUS_BADGE: Record<PourStatus, string> = {
  "Draft":            "text-content-secondary border-surface-border-hover bg-surface-border",
  "Pending Approval": "text-status-warning  border-status-warning/30 bg-status-warning/10",
  "Approved":         "text-gold            border-gold/30           bg-gold/10",
  "Rejected":         "text-status-error    border-status-error/30   bg-status-error/10",
  "Canceled":         "text-content-muted   border-surface-border-hover bg-surface-border",
  "In Progress":      "text-blue-brand      border-blue-brand/30     bg-blue-brand/10",
  "Completed":        "text-teal            border-teal/40          bg-teal/20",
};
