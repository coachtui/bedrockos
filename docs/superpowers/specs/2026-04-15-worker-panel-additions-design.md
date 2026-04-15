# Worker Panel Additions Design

Date: 2026-04-15  
Status: Approved  
Phase coverage: Phase 1–2 (mock data, in-memory)

---

## 1. Overview

Two additions to the `WorkerInspectorPanel` that are fully implementable without a backend:

1. **Availability toggle** — lets authorized roles flip a worker's `available` boolean in-place
2. **Per-worker activity history** — a new panel section showing events about the worker, filtered from global activity

---

## 2. Availability Toggle

### 2.1 Current state

The Availability section renders a read-only green/grey dot + label. No mutation exists.

### 2.2 Change

For roles in `CAN_EDIT` (superintendent, admin, owner): replace the static display with a clickable toggle.

**UI:**

```
● Available    [toggle button]
```

Toggle button label: "Mark unavailable" when available, "Mark available" when not.

Clicking calls `toggleWorkerAvailability(worker.id)`.

For all other roles the section remains read-only (dot + text only).

### 2.3 OrgProvider mutator

```ts
toggleWorkerAvailability(workerId: string): void
```

- Flips `worker.available`
- Emits activity:
  - `"marked [worker.name] as available"` or `"marked [worker.name] as unavailable"`
  - `entity_type: "worker"`, `entity_id: workerId`, `module: "shell"`

---

## 3. Per-Worker Activity History

### 3.1 ActivityEvent type change

Add `entity_id?: string` to `ActivityEvent`:

```ts
export interface ActivityEvent {
  id:           string;
  actor_name:   string;
  action:       string;
  entity_type:  string;
  entity_id?:   string;   // ← new
  entity_name:  string;
  project_id:   string;
  module:       ModuleId | "shell";
  timestamp:    string;
  target_type?: "issue" | "alert" | "asset" | "project";
  target_id?:   string;
}
```

All existing events that don't set `entity_id` remain valid (field is optional).

### 3.2 Emitters that set entity_id

Update `reassignWorker` to include `entity_id: workerId` in its emitted event.

`toggleWorkerAvailability` (new) also includes `entity_id: workerId`.

### 3.3 Seed data

Add 2–3 entries to `MOCK_ACTIVITY` with `entity_type: "worker"` and `entity_id` set to real worker IDs from mock data:

- One past reassignment for `worker_001` (Tony Reeves)
- One availability change for `worker_004` (Priya Nair)

### 3.4 Panel section

Add a 4th section "Activity" at the bottom of the panel body, below Availability.

**Filter logic:**

```ts
const workerActivity = [...MOCK_ACTIVITY, ...emittedActivity]
  .filter(e => e.entity_type === "worker" && e.entity_id === worker.id)
  .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
```

**Each row:**
- Action text (e.g. "Tui Alailima reassigned Tony Reeves to Foundation Crew A")
- Relative timestamp (e.g. "3 days ago") — use a simple helper, no library

**Empty state:** *"No activity on record"* in italic muted text

---

## 4. Permission Summary

| Action | Owner | Admin | Superintendent | Others |
|--------|-------|-------|----------------|--------|
| Toggle availability | ✓ | ✓ | ✓ | — |
| View activity history | ✓ | ✓ | ✓ | ✓ |

---

## 5. Files

### Modified
| File | What changes |
|------|-------------|
| `src/types/domain.ts` | Add `entity_id?` to `ActivityEvent` |
| `src/providers/OrgProvider.tsx` | Add `toggleWorkerAvailability`, update `reassignWorker` to include `entity_id` |
| `src/lib/mock/activity.ts` | Seed 2–3 worker activity entries |
| `src/components/shell/WorkerInspectorPanel.tsx` | Toggle UI in Availability section + new Activity section |

### No new files required

---

## 6. Out of scope

- Editing worker name or role (Phase 3)
- Worker profile photo (Phase 3 — needs file upload)
- Actor-based activity (events where worker was the actor, not the subject) — needs `actor_id`
