# Workers Page + Skills System Design

Date: 2026-04-14  
Status: Approved  
Phase coverage: Phase 1–2 (mock data, no backend)

---

## 1. Overview

Add a dedicated `/workers` page and an Add Worker form. Workers can have skills attached — a role-grouped, extensible catalog. Superintendents and above can add new skills to the catalog inline during worker creation.

This is a self-contained feature. It does not depend on CSV import or the onboarding wizard (those are separate plans).

---

## 2. Data Model Changes

### 2.1 WorkerRole — add carpenter

```ts
// src/types/domain.ts
export type WorkerRole =
  | "mechanic"
  | "driver"
  | "mason"
  | "carpenter"   // new
  | "foreman"
  | "superintendent"
  | "operator"
  | "laborer";
```

### 2.2 OrgWorker — add skills field

```ts
export interface OrgWorker {
  id:         string;
  orgId:      string;
  name:       string;
  role:       WorkerRole;
  userId:     string | null;
  available:  boolean;
  skills:     string[];      // new — empty array for workers with no skills on file
  projectId?: string;
  siteName?:  string;
}
```

### 2.3 CreateWorkerInput — new type

```ts
export interface CreateWorkerInput {
  name:   string;
  role:   WorkerRole;
  skills: string[];
}
```

---

## 3. Skill Catalog

### 3.1 Mock file

```ts
// src/lib/mock/skills.ts
import type { WorkerRole } from "@/types/domain";

export const SKILL_CATALOG: Record<WorkerRole, string[]> = {
  operator:       ["Excavator", "Crane", "Dozer", "Pump Truck", "Vac Truck", "Telehandler", "Forklift", "GPS Equipment"],
  driver:         ["Pump Truck", "Vac Truck", "Flatbed", "Water Truck", "GPS Equipment"],
  mechanic:       ["Hydraulic Systems", "Diesel Engine", "Electrical Diagnostics", "Welding", "GPS Equipment"],
  mason:          ["Brick", "Block", "Stone", "Waterline Install", "Demo"],
  carpenter:      ["Formwork", "Finish Carpentry", "Framing", "Demo"],
  laborer:        ["Waterline Install", "Demo", "Concrete Finishing", "Rebar", "Excavation Support"],
  foreman:        ["GPS Equipment", "Safety Officer", "OSHA 30"],
  superintendent: ["GPS Equipment", "Safety Officer", "OSHA 30"],
};
```

Skills that apply across roles (GPS Equipment, OSHA 30, Demo) are repeated in each relevant role's list. This is intentional — it avoids a shared-pool join and keeps the catalog simple for Phase 1–2.

### 3.2 OrgProvider additions

```ts
// State
skillCatalog: Record<WorkerRole, string[]>   // seeded from SKILL_CATALOG, mutable in-session

// Mutators
addWorker(input: CreateWorkerInput): OrgWorker
addSkillToRole(role: WorkerRole, skill: string): void
```

`addSkillToRole` appends the new skill to `skillCatalog[role]`. This is in-memory only — skills added during a session are lost on refresh. Phase 3 swap: POST to `/api/skills`.

`addWorker` creates an `OrgWorker` with a new UUID, appends it to the `workers` array, and calls `addEmittedActivity`:

```
"[currentUser.name] added [worker.name] to the roster" — module: shell
```

---

## 4. Add Worker Modal

### Entry point

Workers page header "Add Worker" button.

### Flow

**Step 1 — Worker details**

Fields:
- Name (required, text input)
- Role (required, dropdown — all 8 WorkerRole values, capitalized)

Validation: name must not be empty. Error shown inline; user cannot advance to step 2 without a valid name.

When role changes on step 1, the selected skills from step 2 are cleared (same pattern as CreateCrewModal project change).

**Step 2 — Skills**

Shows the skill pool for the selected role (`skillCatalog[role]`).

Multi-select: each skill is a toggle button (same visual as CreateCrewModal worker picker — gold highlight when selected, check icon).

Selected count shown at top: "N skills selected".

**Add custom skill (superintendent + above only):**

At the bottom of the skill list, users with role `superintendent`, `foreman` (no — spec says superintendent and above), `admin`, or `owner` see a small inline input:

> `[____________] [Add]`

On submit:
1. Calls `addSkillToRole(role, trimmedValue)`
2. Auto-selects the new skill
3. Clears the input

The input does not appear for roles below superintendent.

**Role access for custom skills:**

Roles that can add skills: `owner`, `admin`, `superintendent`  
Roles that cannot: `pm`, `project_engineer`, `foreman`, `mechanic`, `driver`, `mason`, `carpenter`, `laborer`

Note: foreman was intentionally excluded — the user specified "superintendent and above."

**On submit:**

Calls `addWorker({ name: name.trim(), role, skills: Array.from(selectedSkills) })`.  
Calls `onCreated(worker.id)` then `onClose()`.

### Props

```ts
interface Props {
  onClose:   () => void;
  onCreated: (workerId: string) => void;
}
```

---

## 5. Workers Page

### Route

`/workers` — server wrapper + client component, same pattern as `/projects`, `/assets`, `/crews`.

### Files

```
src/app/(shell)/workers/page.tsx     — server wrapper, exports metadata
src/app/(shell)/workers/client.tsx   — WorkersClient, "use client"
src/components/shell/AddWorkerModal.tsx
```

### WorkersClient

Reads `workers` from `useOrg()`.

Header:
- Title: "Workers"
- Subtitle: `"N workers · N available"`
- Action: "Add Worker" button

Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

**Worker card:**

```
[User icon]                    [available dot]
Name
Role (capitalized)
Skills: [Tag] [Tag] [Tag] +N more
         — or —
         No skills on file
```

- Availability dot: green (`bg-green-400`) if `available`, grey (`bg-content-muted`) if not
- Skills tags: `text-xs bg-surface-overlay border border-surface-border rounded px-2 py-0.5`
- Show up to 3 skills. If more: `+N more` label in the same style.
- If `skills.length === 0`: show `"No skills on file"` in `text-content-muted`

### Mock data update

All 12 existing workers in `MOCK_WORKERS` get `skills: []`. The `skills` field is required on `OrgWorker` — no optional fallback.

---

## 6. MOCK_WORKERS update

`src/lib/mock/workers.ts` needs two changes:
1. Add `skills: []` to all 12 existing workers.
2. Add `"carpenter"` to `KNOWN_WORKER_ROLES` set in `src/lib/registry/workforce.ts`.

---

## 7. What is NOT in scope

- Edit worker (no edit flow in Phase 1–2)
- Delete worker
- Assign worker to project from the workers page (done via Create Crew)
- Skill filtering / search on the workers list
- Skill editing after creation
- Skills visible in crew cards (crews show member count only)
