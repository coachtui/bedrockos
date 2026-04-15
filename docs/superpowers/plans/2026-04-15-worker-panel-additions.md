# Worker Panel Additions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an availability toggle and a per-worker activity history section to `WorkerInspectorPanel`.

**Architecture:** Add `entity_id?` to `ActivityEvent` so worker events can be reliably filtered by ID, then wire up a new `toggleWorkerAvailability` mutator in OrgProvider. The panel gains a toggle button in the Availability section (for `CAN_EDIT` roles) and a new Activity section at the bottom showing filtered events.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS — no test framework, verify with `tsc --noEmit` and browser.

---

## File Map

| File | Change |
|---|---|
| `src/types/domain.ts` | Add `entity_id?` to `ActivityEvent` |
| `src/providers/OrgProvider.tsx` | Add `toggleWorkerAvailability` to interface + implementation; add `entity_id` to `reassignWorker` emitter |
| `src/lib/mock/activity.ts` | Seed 3 worker activity entries |
| `src/components/shell/WorkerInspectorPanel.tsx` | Availability toggle UI + Activity section + `relativeTime` helper |

---

### Task 1: Add `entity_id` to `ActivityEvent`

**Files:**
- Modify: `src/types/domain.ts:57-69`

- [ ] **Step 1: Add the field**

In `src/types/domain.ts`, update `ActivityEvent` to add `entity_id?` after `entity_type`:

```ts
export interface ActivityEvent {
  id:           string;
  actor_name:   string;
  action:       string;
  entity_type:  string;
  entity_id?:   string;
  entity_name:  string;
  project_id:   string;
  module:       ModuleId | "shell";
  timestamp:    string;
  /* Routing context */
  target_type?: "issue" | "alert" | "asset" | "project";
  target_id?:   string;
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit
```

Expected: no errors (field is optional, all existing usages stay valid).

- [ ] **Step 3: Commit**

```bash
git add src/types/domain.ts
git commit -m "feat(types): add entity_id to ActivityEvent"
```

---

### Task 2: Add `toggleWorkerAvailability` to OrgProvider

**Files:**
- Modify: `src/providers/OrgProvider.tsx:47-48` (interface)
- Modify: `src/providers/OrgProvider.tsx:224-285` (implementation + reassignWorker update)
- Modify: `src/providers/OrgProvider.tsx:326-333` (context value)

- [ ] **Step 1: Add to interface**

In `src/providers/OrgProvider.tsx`, add `toggleWorkerAvailability` to the `OrgContextValue` interface after `reassignWorker`:

```ts
  updateWorkerSkills:         (workerId: string, skills: string[]) => void;
  reassignWorker:             (workerId: string, projectId: string | undefined, crewId: string | undefined) => void;
  toggleWorkerAvailability:   (workerId: string) => void;
```

- [ ] **Step 2: Implement the function**

Add this function after `updateWorkerSkills` (around line 228):

```ts
function toggleWorkerAvailability(workerId: string): void {
  const worker = workers.find((w) => w.id === workerId);
  if (!worker) return;

  const next = !worker.available;
  setWorkers((prev) =>
    prev.map((w) => (w.id === workerId ? { ...w, available: next } : w))
  );

  addEmittedActivity({
    id:          crypto.randomUUID(),
    actor_name:  config.currentUser.name,
    action:      `marked ${worker.name} as ${next ? "available" : "unavailable"}`,
    entity_type: "worker",
    entity_id:   workerId,
    entity_name: worker.name,
    project_id:  worker.projectId ?? config.currentProject.id,
    module:      "shell",
    timestamp:   new Date().toISOString(),
  });
}
```

- [ ] **Step 3: Add `entity_id` to the `reassignWorker` emitter**

In the `reassignWorker` function, update the `addEmittedActivity` call (around line 275) to include `entity_id`:

```ts
addEmittedActivity({
  id:          crypto.randomUUID(),
  actor_name:  config.currentUser.name,
  action,
  entity_type: "worker",
  entity_id:   workerId,
  entity_name: worker.name,
  project_id:  projectId ?? config.currentProject.id,
  module:      "shell",
  timestamp:   new Date().toISOString(),
});
```

- [ ] **Step 4: Expose in context value**

In the `OrgContext.Provider` value object (around line 326), add `toggleWorkerAvailability`:

```ts
        updateWorkerSkills,
        reassignWorker,
        toggleWorkerAvailability,
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/providers/OrgProvider.tsx
git commit -m "feat(org): add toggleWorkerAvailability mutator, add entity_id to reassignWorker activity"
```

---

### Task 3: Seed worker activity in mock data

**Files:**
- Modify: `src/lib/mock/activity.ts`

- [ ] **Step 1: Add 3 worker entries**

Append the following entries to the `MOCK_ACTIVITY` array in `src/lib/mock/activity.ts`, before the closing `]`:

```ts
  // ── Workers ───────────────────────────────────────────────────────────────
  {
    id:          "act_w_001",
    actor_name:  "Sarah Kim",
    action:      "moved Tony Reeves to Highland Tower — Phase 2",
    entity_type: "worker",
    entity_id:   "worker_001",
    entity_name: "Tony Reeves",
    project_id:  "proj_highland_002",
    module:      "shell",
    timestamp:   "2026-04-10T09:00:00Z",
  },
  {
    id:          "act_w_002",
    actor_name:  "Sarah Kim",
    action:      "marked Priya Nair as unavailable",
    entity_type: "worker",
    entity_id:   "worker_004",
    entity_name: "Priya Nair",
    project_id:  "proj_highland_002",
    module:      "shell",
    timestamp:   "2026-04-12T14:30:00Z",
  },
  {
    id:          "act_w_003",
    actor_name:  "Sarah Kim",
    action:      "reassigned Tony Reeves to Foundation Crew A",
    entity_type: "worker",
    entity_id:   "worker_001",
    entity_name: "Tony Reeves",
    project_id:  "proj_highland_002",
    module:      "shell",
    timestamp:   "2026-04-13T11:15:00Z",
  },
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mock/activity.ts
git commit -m "feat(mock): seed worker activity events with entity_id"
```

---

### Task 4: Availability toggle UI in WorkerInspectorPanel

**Files:**
- Modify: `src/components/shell/WorkerInspectorPanel.tsx`

- [ ] **Step 1: Destructure `toggleWorkerAvailability` from `useOrg()`**

Update the `useOrg()` destructure at the top of the component (around line 17):

```ts
  const {
    workers, crews, projects, skillCatalog,
    currentProject, role,
    updateWorkerSkills, reassignWorker, addSkillToRole,
    toggleWorkerAvailability,
  } = useOrg();
```

- [ ] **Step 2: Replace the read-only Availability section**

Find the Availability section (around line 334) and replace it:

```tsx
          {/* ── Availability ───────────────────────────────────────────── */}
          <section className="border-t border-surface-border pt-4 pb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Availability
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${worker.available ? "bg-green-400" : "bg-content-muted"}`}
                />
                <span className="text-xs text-content-primary">
                  {worker.available ? "Available" : "Unavailable"}
                </span>
              </div>
              {canEdit && (
                <button
                  onClick={() => toggleWorkerAvailability(worker.id)}
                  className="text-[10px] font-semibold text-content-muted hover:text-teal transition-colors"
                >
                  {worker.available ? "Mark unavailable" : "Mark available"}
                </button>
              )}
            </div>
          </section>
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Verify in browser**

Start the dev server:
```bash
cd /Users/tui/aigacp && npm run dev
```

Open `/workers`, click any worker card. In the panel:
- As `superintendent`/`admin`/`owner`: Availability section shows dot + label + "Mark unavailable" / "Mark available" button. Clicking it flips the label and dot color.
- As `foreman`/`mechanic`: button is absent, only dot + label shown.

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/WorkerInspectorPanel.tsx
git commit -m "feat(workers): availability toggle in inspector panel"
```

---

### Task 5: Activity section in WorkerInspectorPanel

**Files:**
- Modify: `src/components/shell/WorkerInspectorPanel.tsx`

- [ ] **Step 1: Import MOCK_ACTIVITY**

Add the import at the top of `WorkerInspectorPanel.tsx` (after the existing imports):

```ts
import { MOCK_ACTIVITY } from "@/lib/mock/activity";
```

- [ ] **Step 2: Add `relativeTime` helper**

Add this function above the `WorkerInspectorPanel` component declaration:

```ts
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
```

- [ ] **Step 3: Compute `workerActivity` inside the component**

Add this derived value inside `WorkerInspectorPanel`, after the existing derived values (after `availableSkills`):

```ts
  const workerActivity = worker
    ? [...MOCK_ACTIVITY, ...emittedActivity]
        .filter((e) => e.entity_type === "worker" && e.entity_id === worker.id)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    : [];
```

Also destructure `emittedActivity` from `useOrg()`:

```ts
  const {
    workers, crews, projects, skillCatalog,
    currentProject, role, emittedActivity,
    updateWorkerSkills, reassignWorker, addSkillToRole,
    toggleWorkerAvailability,
  } = useOrg();
```

- [ ] **Step 4: Add the Activity section**

Add this section after the Availability section closing `</section>` tag:

```tsx
          {/* ── Activity ───────────────────────────────────────────────── */}
          <section className="border-t border-surface-border pt-4 pb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Activity
            </h3>
            {workerActivity.length === 0 ? (
              <p className="text-xs text-content-muted italic">No activity on record</p>
            ) : (
              <ul className="space-y-3">
                {workerActivity.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-3">
                    <p className="text-xs text-content-secondary leading-snug">
                      <span className="font-semibold text-content-primary">{event.actor_name}</span>
                      {" "}{event.action}
                    </p>
                    <span className="text-[10px] text-content-muted whitespace-nowrap flex-shrink-0">
                      {relativeTime(event.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Verify in browser**

On `/workers`:
- Open Tony Reeves (worker_001): Activity section shows 2 seeded entries ("moved Tony Reeves…", "reassigned Tony Reeves…"), newest first.
- Open Priya Nair (worker_004): Activity section shows 1 seeded entry ("marked Priya Nair as unavailable").
- Open any other worker: Activity section shows "No activity on record".
- Toggle availability on any worker: new event appears in the Activity section immediately.
- Reassign a worker: new event appears in the Activity section immediately.

- [ ] **Step 7: Commit**

```bash
git add src/components/shell/WorkerInspectorPanel.tsx
git commit -m "feat(workers): per-worker activity history in inspector panel"
```
