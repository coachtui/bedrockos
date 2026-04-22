/**
 * MX Business Rules
 *
 * Status transitions, permission helpers, and badge/label styling.
 * Follows the pourRules.ts pattern — pure functions, no side effects.
 */

import type { MxWorkOrderStatus, MxWorkOrderPriority, MxWorkOrderCategory, ReadinessStatus, MxWorkOrder } from "./types";
import type { UserRole } from "@/types/org";

// ── Status transitions ────────────────────────────────────────────────────────

/** Valid forward/back transitions for each status.
 *  UI should only offer these transitions to the user. */
export const WO_TRANSITIONS: Record<MxWorkOrderStatus, MxWorkOrderStatus[]> = {
  draft:         ["open", "canceled"],
  open:          ["triage", "in_progress", "canceled"],
  triage:        ["approved", "canceled"],
  approved:      ["scheduled", "in_progress", "canceled"],
  scheduled:     ["in_progress", "canceled"],
  in_progress:   ["waiting_parts", "blocked", "completed"],
  waiting_parts: ["in_progress", "blocked", "canceled"],
  blocked:       ["in_progress", "canceled"],
  completed:     [],
  canceled:      [],
};

/** Statuses that count as "active" — block equipment and affect readiness */
export const ACTIVE_STATUSES: MxWorkOrderStatus[] = [
  "open", "triage", "approved", "scheduled", "in_progress", "waiting_parts", "blocked",
];

/** Statuses that are terminal — no further transitions */
export const TERMINAL_STATUSES: MxWorkOrderStatus[] = ["completed", "canceled"];

// ── Permission helpers ────────────────────────────────────────────────────────

/** Roles with elevated access — can act across all projects and update WO status */
const ELEVATED_ROLES: UserRole[] = ["owner", "admin", "mechanic"];

/** Roles that can create a new work order (or report an equipment issue) */
export function canCreateWorkOrder(role: UserRole): boolean {
  return ["owner", "admin", "mechanic", "foreman", "superintendent", "project_engineer"].includes(role);
}

/** Roles that can approve a work order (move from triage → approved) */
export function canApproveWorkOrder(role: UserRole): boolean {
  return ["owner", "admin"].includes(role);
}

/** Roles that can assign mechanics to a work order */
export function canAssignMechanic(role: UserRole): boolean {
  return ["owner", "admin"].includes(role);
}

/** Can this actor update status on a work order? */
export function canUpdateWorkOrderStatus(role: UserRole): boolean {
  return ELEVATED_ROLES.includes(role);
}

/** Roles that can see work orders across all projects (not just current jobsite) */
export function canSeeAllProjects(role: UserRole): boolean {
  return ELEVATED_ROLES.includes(role);
}

/** Returns work orders visible to the current role/project combination */
export function filterWorkOrdersByVisibility(
  workOrders: MxWorkOrder[],
  role: UserRole,
  currentProjectId: string,
): MxWorkOrder[] {
  if (canSeeAllProjects(role)) return workOrders;
  return workOrders.filter((wo) => wo.projectId === currentProjectId);
}

// ── Label maps ────────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<MxWorkOrderStatus, string> = {
  draft:         "Draft",
  open:          "Open",
  triage:        "Triage",
  approved:      "Approved",
  scheduled:     "Scheduled",
  in_progress:   "In Progress",
  waiting_parts: "Waiting Parts",
  blocked:       "Blocked",
  completed:     "Completed",
  canceled:      "Canceled",
};

export const PRIORITY_LABELS: Record<MxWorkOrderPriority, string> = {
  critical: "Critical",
  high:     "High",
  medium:   "Medium",
  low:      "Low",
};

export const CATEGORY_LABELS: Record<MxWorkOrderCategory, string> = {
  preventive:   "Preventive",
  corrective:   "Corrective",
  emergency:    "Emergency",
  inspection:   "Inspection",
  modification: "Modification",
};

export const READINESS_LABELS: Record<ReadinessStatus, string> = {
  ready:             "Ready",
  limited:           "Limited",
  at_risk:           "At Risk",
  scheduled_service: "Scheduled Service",
  in_shop:           "In Shop",
  awaiting_parts:    "Awaiting Parts",
  down:              "Down",
};

// ── Badge styles ──────────────────────────────────────────────────────────────

/** Tailwind classes for status badges */
export const STATUS_BADGE: Record<MxWorkOrderStatus, string> = {
  draft:         "text-content-secondary border-surface-border-hover bg-surface-border",
  open:          "text-blue-brand border-blue-brand/30 bg-blue-brand/10",
  triage:        "text-gold border-gold/30 bg-gold/10",
  approved:      "text-teal border-teal/30 bg-teal/10",
  scheduled:     "text-teal border-teal/40 bg-teal/15",
  in_progress:   "text-status-info border-status-info/30 bg-status-info/10",
  waiting_parts: "text-gold border-gold/40 bg-gold/15",
  blocked:       "text-status-critical border-status-critical/30 bg-status-critical/10",
  completed:     "text-teal border-teal/40 bg-teal/20",
  canceled:      "text-content-muted border-surface-border-hover bg-surface-border line-through",
};

/** Tailwind classes for priority badges */
export const PRIORITY_BADGE: Record<MxWorkOrderPriority, string> = {
  critical: "text-status-critical border-status-critical/40 bg-status-critical/15 font-bold",
  high:     "text-status-critical border-status-critical/30 bg-status-critical/10",
  medium:   "text-gold border-gold/30 bg-gold/10",
  low:      "text-content-secondary border-surface-border-hover bg-surface-border",
};

/** Tailwind classes for readiness badges */
export const READINESS_BADGE: Record<ReadinessStatus, string> = {
  ready:             "text-teal border-teal/40 bg-teal/20",
  limited:           "text-gold border-gold/30 bg-gold/10",
  at_risk:           "text-gold border-gold/40 bg-gold/15 font-semibold",
  scheduled_service: "text-teal border-teal/30 bg-teal/10",
  in_shop:           "text-status-info border-status-info/30 bg-status-info/10",
  awaiting_parts:    "text-gold border-gold/40 bg-gold/15",
  down:              "text-status-critical border-status-critical/30 bg-status-critical/10 font-bold",
};
