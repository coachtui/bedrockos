# MX Agent — Spec

**Status:** Ready to build  
**Trigger:** Client commitment on mechanic scheduler  
**Module:** MX (Maintenance Execution)  
**Stack:** Next.js + Supabase + Claude API

---

## What It Does

The MX agent replaces the manual cognitive work the admin does when assigning mechanics to work orders. It reads open work orders, checks mechanic skills and availability, makes an assignment recommendation, and waits for approval. It also monitors in-progress work orders approaching their scheduled end and nudges the lead for a status update.

Two jobs:
1. **Assignment** — recommend the right mechanic(s) for an open work order
2. **Nudge** — ping the lead when a work order is almost due and hasn't moved to completed

---

## What Needs to Be Built

The `MxWorkOrder` and `MechanicAssignment` types are already solid. Three additions needed:

### 1. Mechanic Skills + Certifications

Add to the mechanic/worker profile in Supabase:

```ts
interface MechanicProfile {
  userId:         string;
  skills:         string[];          // e.g. ["hydraulics", "diesel", "electrical"]
  certifications: Certification[];
}

interface Certification {
  id:          string;
  name:        string;              // e.g. "OSHA 30", "CDL Class A"
  issuedBy:    string;
  issuedDate:  string;              // "YYYY-MM-DD"
  expiresAt?:  string;              // "YYYY-MM-DD" — agent flags expired certs
}
```

Skills are free-form tags. Certifications are structured so the agent can verify expiry before assigning.

### 2. Mechanic Availability

Mechanics already get assigned via `assignedMechanicIds`. The agent needs to know capacity — how many hours are already committed vs. available.

Add to Supabase:
```ts
interface MechanicAvailability {
  userId:            string;
  date:              string;         // "YYYY-MM-DD"
  availableHours:    number;         // scheduled hours available that day
  committedHours:    number;         // sum of estimatedHours on active WOs
}
```

`committedHours` is derived from active work orders — can be a computed view in Supabase rather than a stored field.

### 3. Nudge Trigger

No new table needed — this is a cron job or edge function.

Logic:
- Query work orders where `status = 'in_progress'` AND `scheduledEnd` is within 24 hours
- For each: send notification to `assignedMechanicIds[0]` (or lead) asking for status
- Lead responds: "done" → transition to `completed` | "need more time" → extend `scheduledEnd`
- Agent logs the interaction on the work order

Notification channel: push notification in-app (phase 1), SMS or Telegram (phase 2).

---

## Agent Assignment Logic

When a work order moves to `approved`:

1. Read `category`, `priority`, `estimatedHours`, `neededByDate`, `equipmentId`
2. Match against mechanic `skills` — filter to mechanics who can do this work
3. Check `certifications` if category requires one (e.g. inspection work)
4. Check availability — filter to mechanics with enough `availableHours` on the target date
5. Rank by: priority match → availability fit → fewest active WOs
6. Present top recommendation to admin with reasoning
7. Admin approves → work order transitions to `scheduled`, `assignedMechanicIds` updated

---

## Same Pattern for Manpower (CRU)

The same three additions (skills, certifications, availability) apply to CRU crew scheduling. Once MX agent is running, CRU gets the identical pattern — different domain, same architecture. Build MX first, CRU is a port.

---

## Phase Plan

| Phase | Scope |
|-------|-------|
| 1 | Add skills + certifications to mechanic profiles in Supabase |
| 2 | Build availability model (computed view on active WOs) |
| 3 | Agent assignment logic + admin approval UI |
| 4 | Nudge cron job + in-app notification |
| 5 | Port same pattern to CRU manpower scheduling |

---

## Notes

- `MechanicAssignment` type is already stubbed in `src/lib/mx/types.ts` — Phase 3 promotes it to its own Supabase table
- Agent uses Claude API with tool use — reads WO + mechanic data, returns structured assignment recommendation
- Approval pattern: agent proposes → admin confirms → system executes. No autonomous writes to production data without human approval in Phase 1
