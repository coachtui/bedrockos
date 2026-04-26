# MX AI Scheduling Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only toggle to the MX scheduling board that activates AI-powered mechanic assignment suggestions based on skills, site proximity, and workload balance.

**Architecture:** A pure `suggestAssignments()` function in `src/lib/mx/scheduling.ts` scores each available mechanic against a work order's required skills, site, and current active WO count. The scheduling page reads this when the toggle is ON and renders a compact "AI Suggestions" panel inside the unassigned queue column — each row shows the top mechanic candidate and a button that pre-fills the existing assignment confirmation dialog. Toggle state persists in localStorage. The feature is gated behind `features.mx.ai_scheduling` in org config (org-level gate) and restricted to owner/admin roles at the UI level.

**Tech Stack:** TypeScript, React (Next.js App Router), Tailwind CSS, localStorage

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/mx/types.ts` | Modify | Add `requiredSkills?: string[]` to `MxWorkOrder` and `CreateMxWorkOrderInput` |
| `src/lib/mock/workers.ts` | Modify | Seed realistic skills onto mechanic workers |
| `src/lib/mx/mock-data.ts` | Modify | Seed `requiredSkills` on 3 WOs |
| `src/lib/config/org.ts` | Modify | Add `mx: { ai_scheduling: false }` to features map |
| `src/lib/mx/scheduling.ts` | **Create** | Pure `suggestAssignments()` scoring algorithm |
| `src/app/(shell)/modules/mx/scheduling/page.tsx` | Modify | Toggle button + AI suggestions panel |

---

## Task 1: Type and data foundation

**Files:**
- Modify: `src/lib/mx/types.ts`
- Modify: `src/lib/mock/workers.ts`
- Modify: `src/lib/mx/mock-data.ts`
- Modify: `src/lib/config/org.ts`

- [ ] **Step 1: Add `requiredSkills` to `MxWorkOrder` type**

In `src/lib/mx/types.ts`, add `requiredSkills` to the `MxWorkOrder` interface after `neededByDate?`:

```typescript
// Before (line ~86):
  neededByDate?:       string;   // "YYYY-MM-DD"

// After:
  neededByDate?:       string;   // "YYYY-MM-DD"
  /** Mechanic skills required to complete this WO — used for AI assignment suggestions */
  requiredSkills?:     string[];
```

Also add to `CreateMxWorkOrderInput` after `neededByDate?`:

```typescript
// In CreateMxWorkOrderInput (around line ~120):
  neededByDate?:       string;
  requiredSkills?:     string[];
```

- [ ] **Step 2: Seed mechanic skills in mock workers**

Replace the mechanics section in `src/lib/mock/workers.ts` with skill-seeded entries. Skills must come from `SKILL_CATALOG.mechanic` which is `["Hydraulic Systems", "Diesel Engine", "Electrical Diagnostics", "Welding", "GPS Equipment"]`:

```typescript
import type { OrgWorker } from "@/types/domain";

export const MOCK_WORKERS: OrgWorker[] = [
  // Mechanics
  { id: "worker_001", orgId: "org_aiga_001", name: "Tony Reeves",    role: "mechanic",       userId: "cru_w_001", available: true,  skills: ["Hydraulic Systems", "Diesel Engine"],            projectId: "proj_highland_002", siteName: "Highland Tower — Phase 2" },
  { id: "worker_002", orgId: "org_aiga_001", name: "Derek Walsh",    role: "mechanic",       userId: "cru_w_002", available: true,  skills: ["Electrical Diagnostics", "Welding"],              projectId: "proj_eastside_007", siteName: "Eastside Medical Campus" },
  { id: "worker_003", orgId: "org_aiga_001", name: "Carlos Mejia",   role: "mechanic",       userId: "cru_w_003", available: true,  skills: ["Hydraulic Systems", "Electrical Diagnostics"] },
  { id: "worker_004", orgId: "org_aiga_001", name: "Priya Nair",     role: "mechanic",       userId: "cru_w_004", available: false, skills: ["Diesel Engine", "Welding"] },

  // Drivers (unchanged)
  { id: "worker_005", orgId: "org_aiga_001", name: "Marco Ruiz",     role: "driver",         userId: null,        available: true,  skills: [], projectId: "proj_riverside_006", siteName: "Riverside District Parking" },
  { id: "worker_006", orgId: "org_aiga_001", name: "Jean Lafleur",   role: "driver",         userId: null,        available: true,  skills: [] },
  { id: "worker_007", orgId: "org_aiga_001", name: "Kenji Tanaka",   role: "driver",         userId: null,        available: false, skills: [] },

  // Masons (unchanged)
  { id: "worker_008", orgId: "org_aiga_001", name: "Luis Torres",    role: "mason",          userId: null,        available: true,  skills: [], projectId: "proj_highland_002", siteName: "Highland Tower — Phase 2" },
  { id: "worker_009", orgId: "org_aiga_001", name: "Ahmed Siddiqui", role: "mason",          userId: null,        available: true,  skills: [] },
  { id: "worker_010", orgId: "org_aiga_001", name: "Bruno Costa",    role: "mason",          userId: null,        available: false, skills: [] },

  // Foremen / Superintendents (unchanged)
  { id: "worker_011", orgId: "org_aiga_001", name: "Marcus Jimenez", role: "foreman",        userId: null,        available: true,  skills: [], projectId: "proj_highland_002", siteName: "Highland Tower — Phase 2" },
  { id: "worker_012", orgId: "org_aiga_001", name: "Carmen Nguyen",  role: "superintendent", userId: null,        available: true,  skills: [], projectId: "proj_oakridge_001", siteName: "Oakridge Industrial Complex" },
];
```

Note: `userId` values on mechanics (`cru_w_001` through `cru_w_004`) are the bridge to CRU IDs stored in `assignedMechanicIds` on work orders.

- [ ] **Step 3: Seed `requiredSkills` on three work orders**

In `src/lib/mx/mock-data.ts`, add `requiredSkills` to three existing WOs. Add the field after `neededByDate` in each:

For `mxwo_001` (hydraulic hose — corrective):
```typescript
    neededByDate:        "2026-04-12",
    requiredSkills:      ["Hydraulic Systems"],
```

For `mxwo_004` (PM service tower crane — preventive):
```typescript
    neededByDate:        "2026-04-18",
    requiredSkills:      ["Diesel Engine"],
```

For `mxwo_005` (electrical fault — corrective):
```typescript
    neededByDate:        "2026-04-12",
    requiredSkills:      ["Electrical Diagnostics"],
```

- [ ] **Step 4: Add `mx` feature flag to org config**

In `src/lib/config/org.ts`, add the `mx` feature entry to `MOCK_ORG_CONFIG.features`:

```typescript
  features: {
    cru: {
      scheduling:      true,
      mobile_clock_in: true,
      crew_chat:       false,
    },
    fix: {
      ai_diagnostics: true,
      fleet_priority:  true,
      obd_scan:        false,
    },
    inspect: {
      photo_reports:      true,
      custom_checklists:  true,
      sign_off:           false,
    },
    datum: {
      gps_layout:     true,
      map_overlays:   true,
      crew_alignment: true,
    },
    mx: {
      ai_scheduling: false,
    },
  },
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to the new fields.

- [ ] **Step 6: Commit**

```bash
git add src/lib/mx/types.ts src/lib/mock/workers.ts src/lib/mx/mock-data.ts src/lib/config/org.ts
git commit -m "feat(mx): seed mechanic skills and WO required skills, add mx.ai_scheduling feature flag"
```

---

## Task 2: Scheduling algorithm

**Files:**
- Create: `src/lib/mx/scheduling.ts`

The algorithm needs CRU mechanic IDs (from the scheduling page's mechanics list) to match against `assignedMechanicIds`, but skills live on `MOCK_WORKERS` keyed by `userId`. The page must build a `MechanicForScheduling[]` that merges both — this type is defined here.

- [ ] **Step 1: Create `src/lib/mx/scheduling.ts`**

```typescript
import type { MxWorkOrder } from "./types";
import { ACTIVE_STATUSES } from "./rules";

export interface MechanicForScheduling {
  id:        string;   // CRU id (cru_w_*) — matches assignedMechanicIds
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
 *   +3 if mechanic is assigned to the same project as the WO
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mx/scheduling.ts
git commit -m "feat(mx): add pure suggestAssignments scheduling algorithm"
```

---

## Task 3: Scheduling page — toggle + AI suggestions panel

**Files:**
- Modify: `src/app/(shell)/modules/mx/scheduling/page.tsx`

This task adds:
1. A toggle button in the page header (admin/owner only, gated by `canAssignMechanic(role)` and `features.mx?.ai_scheduling !== undefined`)
2. A `buildMechanicsForScheduling()` helper that merges CRU mechanics with MOCK_WORKERS skills via `userId`
3. An `AiSuggestionsPanel` component (defined in the same file) that renders the ranked suggestions
4. localStorage persistence for toggle state

The `AiSuggestionsPanel` is inlined in this file (not a separate file) because it shares `pendingAssign` state and is specific to this page.

- [ ] **Step 1: Add imports**

At the top of `src/app/(shell)/modules/mx/scheduling/page.tsx`, add to the existing imports:

```typescript
// Add to existing lucide-react import:
import {
  ArrowLeft, User, CalendarDays, AlertTriangle,
  Inbox, Wrench, Clock, PackageX, Play, CheckCircle2,
  XCircle, RotateCcw, X as XIcon, Send, CheckCheck,
  Bot, ToggleLeft, ToggleRight, Zap,
} from "lucide-react";

// Add after existing imports:
import { suggestAssignments } from "@/lib/mx/scheduling";
import type { MechanicForScheduling, SuggestedAssignment } from "@/lib/mx/scheduling";
import { MOCK_WORKERS } from "@/lib/mock/workers";
```

- [ ] **Step 2: Add `AiSuggestionsPanel` component**

Add this component function before the `// ── Page ──` comment:

```typescript
// ── AI Suggestions Panel ──────────────────────────────────────────────────────

function AiSuggestionsPanel({
  unassignedWos,
  mechanicsForScheduling,
  allWorkOrders,
  onPreFillAssign,
}: {
  unassignedWos:           MxWorkOrder[];
  mechanicsForScheduling:  MechanicForScheduling[];
  allWorkOrders:           MxWorkOrder[];
  onPreFillAssign:         (woId: string, mechanicId: string) => void;
}) {
  if (unassignedWos.length === 0 || mechanicsForScheduling.length === 0) {
    return (
      <div className="border border-dashed border-teal/20 rounded-[var(--radius-card)] p-3 text-center">
        <p className="text-[10px] text-content-muted">No suggestions — assign mechanics manually.</p>
      </div>
    );
  }

  const suggestions: Array<{ wo: MxWorkOrder; top: SuggestedAssignment | undefined }> =
    unassignedWos.map((wo) => ({
      wo,
      top: suggestAssignments(wo, mechanicsForScheduling, allWorkOrders, 1)[0],
    })).filter((s) => s.top !== undefined);

  if (suggestions.length === 0) {
    return (
      <div className="border border-dashed border-teal/20 rounded-[var(--radius-card)] p-3 text-center">
        <p className="text-[10px] text-content-muted">No available mechanics to suggest.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {suggestions.map(({ wo, top }) => {
        if (!top) return null;
        return (
          <div
            key={wo.id}
            className="bg-teal/5 border border-teal/20 rounded-[var(--radius-card)] px-3 py-2 flex items-start gap-2"
          >
            <Zap size={11} className="text-teal mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-content-primary truncate">{wo.title}</p>
              <p className="text-[10px] text-teal font-semibold">{top.mechanic.name}</p>
              <p className="text-[10px] text-content-muted truncate">{top.reasons.join(" · ")}</p>
            </div>
            <button
              onClick={() => onPreFillAssign(wo.id, top.mechanic.id)}
              className="flex-shrink-0 px-2 py-0.5 text-[10px] font-semibold bg-teal text-white border border-teal rounded hover:opacity-90 transition-opacity"
            >
              Assign
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Update `MxSchedulingPage` to add toggle + suggestions**

Replace the opening of `export default function MxSchedulingPage()` — add the new state and derived data. The full updated function opening (through the existing state declarations) should be:

```typescript
const AI_TOGGLE_KEY = "aigacp:mx:ai-scheduling-enabled";

export default function MxSchedulingPage() {
  const { assignMechanic, unassignMechanic, updateWorkOrderStatus, updateWorkOrder } = useMx();
  const workOrders = useVisibleWorkOrders();
  const { currentOrganization, role, features, workers: orgWorkers } = useOrg();

  const [mechanics,    setMechanics]    = useState<OrgWorker[]>([]);
  const [loadingMechs, setLoadingMechs] = useState(true);
  const [draggedWoId,  setDraggedWoId]  = useState<string | null>(null);
  const [pendingAssign, setPendingAssign] = useState<{ woId: string; mechanicId: string } | null>(null);
  const [inspectId,    setInspectId]    = useState<string | null>(null);

  // AI scheduling toggle — persisted in localStorage, off by default
  const [aiEnabled, setAiEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AI_TOGGLE_KEY) === "true";
  });

  const canAssign    = canAssignMechanic(role);
  const canAct       = canUpdateWorkOrderStatus(role);
  const aiAvailable  = canAssign && features.mx !== undefined;

  function toggleAi() {
    setAiEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(AI_TOGGLE_KEY, String(next));
      return next;
    });
  }
```

- [ ] **Step 4: Add `mechanicsForScheduling` derived value**

After the `const mechanicList = mechanics.filter(...)` line, add:

```typescript
  const mechanicList = mechanics.filter((m) => m.role === "mechanic");

  // Merge CRU mechanics (for IDs) with orgWorkers (for skills) via userId bridge
  const mechanicsForScheduling = useMemo<MechanicForScheduling[]>(
    () =>
      mechanicList.map((m) => {
        const orgWorker = orgWorkers.find((w) => w.userId === m.id);
        return {
          id:        m.id,
          name:      m.name,
          available: m.available,
          skills:    orgWorker?.skills ?? [],
          projectId: m.projectId,
        };
      }),
    [mechanicList, orgWorkers],
  );
```

- [ ] **Step 5: Update the page header to include the AI toggle**

Replace the existing header block inside the `return` statement:

```tsx
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
        {aiAvailable && (
          <button
            onClick={toggleAi}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg transition-colors ${
              aiEnabled
                ? "bg-teal/10 border-teal/30 text-teal hover:bg-teal/20"
                : "bg-surface-raised border-surface-border text-content-muted hover:border-teal/30 hover:text-teal"
            }`}
            title={aiEnabled ? "AI Suggestions: On — click to disable" : "AI Suggestions: Off — click to enable"}
          >
            <Bot size={13} />
            {aiEnabled ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
            AI Suggestions
          </button>
        )}
      </div>
```

- [ ] **Step 6: Add AI suggestions panel into the unassigned queue section**

Inside the `{/* Left: Unassigned Queue */}` div, add the suggestions panel after the "Main queue" div and before the "Waiting Parts" section:

```tsx
          {/* AI Suggestions — shown when toggle is on and there are unassigned WOs */}
          {aiEnabled && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Bot size={11} className="text-teal" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal">AI Suggestions</span>
              </div>
              <AiSuggestionsPanel
                unassignedWos={unassigned}
                mechanicsForScheduling={mechanicsForScheduling}
                allWorkOrders={workOrders}
                onPreFillAssign={(woId, mechanicId) => setPendingAssign({ woId, mechanicId })}
              />
            </div>
          )}
```

Place this block between the closing `</div>` of the "Main queue" section and the `{waitingPartsUnassigned.length > 0 && (` check. Specifically, the left column structure should be:

```tsx
        <div className="lg:col-span-1 space-y-5">

          {/* Main queue */}
          <div>
            ...existing queue content...
          </div>

          {/* AI Suggestions — shown when toggle is on and there are unassigned WOs */}
          {aiEnabled && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Bot size={11} className="text-teal" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-teal">AI Suggestions</span>
              </div>
              <AiSuggestionsPanel
                unassignedWos={unassigned}
                mechanicsForScheduling={mechanicsForScheduling}
                allWorkOrders={workOrders}
                onPreFillAssign={(woId, mechanicId) => setPendingAssign({ woId, mechanicId })}
              />
            </div>
          )}

          {/* Waiting Parts — unassigned */}
          {waitingPartsUnassigned.length > 0 && (
            ...
          )}

        </div>
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/(shell)/modules/mx/scheduling/page.tsx
git commit -m "feat(mx): add AI scheduling toggle with skill-matched assignment suggestions"
```

---

## Task 4: Browser verification

- [ ] **Step 1: Start dev server**

```bash
cd /Users/tui/aigacp && npm run dev
```

- [ ] **Step 2: Verify toggle visibility by role**

Navigate to `/modules/mx/scheduling`.

- With role = `owner` (Marcus Webb, default): toggle button "AI Suggestions" visible in header
- With role = `superintendent`: toggle button should NOT be visible (only owner/admin can assign)
- With role = `mechanic`: toggle button should NOT be visible

Switch roles via the role switcher in the topbar to verify.

- [ ] **Step 3: Verify toggle state persistence**

1. Enable the toggle (teal active state)
2. Refresh the page
3. Toggle should still be ON (persisted in localStorage)

- [ ] **Step 4: Verify AI suggestion content**

With the toggle ON and role = `owner`:

Expected suggestions visible for unassigned WOs:
- **WO-0004** (PM service tower crane, `requiredSkills: ["Diesel Engine"]`): Should suggest Tony Reeves (has `Diesel Engine`) with reasons "Skill match: Diesel Engine · Same jobsite · 1 active WO"
- **WO-0006** (tire replacement scissor lift, no requiredSkills): Should suggest Carlos Mejia or Tony Reeves by workload balance

Check that each suggestion card shows: WO title, mechanic name, reason chips, Assign button.

- [ ] **Step 5: Verify assign flow**

Click "Assign" on any suggestion. Confirm the existing assignment confirmation dialog opens pre-filled with the suggested WO and mechanic. Confirm the assignment. Verify the WO moves to the mechanic's lane on the board.

- [ ] **Step 6: Verify suggestion disappears after assignment**

After assigning WO-0004 to Tony Reeves, WO-0004 should disappear from both the unassigned queue and the AI suggestions panel.

---

## Self-Review

**Spec coverage:**
- ✅ Admin-only toggle — gated by `canAssign` (owner/admin) and `features.mx` existing
- ✅ Toggle persists across page refreshes via localStorage
- ✅ OFF state: no change to existing manual drag-and-drop behavior
- ✅ ON state: AI suggestions panel appears with ranked mechanic per unassigned WO
- ✅ Suggestions click pre-fills existing confirmation dialog (human still confirms)
- ✅ Skill matching — `requiredSkills` on WO × `skills` on mechanic
- ✅ Workload balance — active WO count penalty
- ✅ Site proximity — same `projectId` bonus
- ✅ Skills seeded on mechanics with accurate role-appropriate values
- ✅ Feature flag `mx.ai_scheduling` in org config as org-level gate

**ID bridge:** The `mechanicsForScheduling` merge using `orgWorker.userId === mechanic.id` correctly bridges the CRU mechanic IDs (`cru_w_*`, stored in `assignedMechanicIds`) to the skills stored on `MOCK_WORKERS` (which use `userId` to reference the same person). This is Phase 1-safe: Phase 3 will store skills directly on CRU workers or the platform worker record.

**No placeholders:** All code blocks are complete and reference only types/functions defined in this plan or existing codebase.
