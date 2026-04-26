import type { MxWorkOrder } from "./types";
import { ACTIVE_STATUSES } from "./rules";

export interface MechanicForScheduling {
  id:        string;   // CRU id (cru_w_*) — matches assignedMechanicIds on work orders
  name:      string;
  available: boolean;
  skills:    string[];
  projectId: string | undefined;
}

export interface SuggestedAssignment {
  mechanic: MechanicForScheduling;
  score:    number;
  reasons:  string[];
}

/**
 * Returns up to `limit` mechanics ranked by fit for the given work order.
 *
 * Scoring:
 *   +2 per matched required skill
 *   +3 if mechanic is on the same project as the WO
 *   -1 per active WO currently assigned to the mechanic (workload penalty)
 *
 * Mechanics with available=false are excluded.
 * Mechanics already assigned to this WO are excluded.
 */
export function suggestAssignments(
  wo:            MxWorkOrder,
  mechanics:     MechanicForScheduling[],
  allWorkOrders: MxWorkOrder[],
  limit = 2,
): SuggestedAssignment[] {
  const eligible = mechanics.filter(
    (m) => m.available && !wo.assignedMechanicIds.includes(m.id),
  );

  const scored = eligible.map((mechanic) => {
    const reasons: string[] = [];
    let score = 0;

    // Skill match
    if (wo.requiredSkills && wo.requiredSkills.length > 0) {
      const matched = wo.requiredSkills.filter((s) => mechanic.skills.includes(s));
      if (matched.length > 0) {
        score += matched.length * 2;
        reasons.push(`Skill match: ${matched.join(", ")}`);
      }
    }

    // Site proximity
    if (mechanic.projectId && wo.projectId && mechanic.projectId === wo.projectId) {
      score += 3;
      reasons.push("Same jobsite");
    }

    // Workload penalty
    const activeCount = allWorkOrders.filter(
      (w) =>
        ACTIVE_STATUSES.includes(w.status) &&
        w.assignedMechanicIds.includes(mechanic.id),
    ).length;

    score -= activeCount;

    if (activeCount === 0) {
      reasons.push("No active WOs");
    } else {
      reasons.push(`${activeCount} active WO${activeCount !== 1 ? "s" : ""}`);
    }

    return { mechanic, score, reasons };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
