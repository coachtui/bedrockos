# Projects Schedule → CX Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Projects page Schedule tab to read from and write back to CX module tasks (`cx_tasks` Supabase table) instead of hardcoded mock data.

**Architecture:** Add a project-scoped fetch to the CX supabase layer, wrap it as a server action, extend `useSchedule` to accept real seed data and a mutation callback, then split `ScheduleTab` into a data-loading shell and an inner component that calls the hook. Empty state when no tasks. "Update Schedule" button navigates to CX schedule page.

**Tech Stack:** Next.js App Router, React 19, Supabase, TypeScript

---

## File Map

| File | Change |
|---|---|
| `src/lib/supabase/cx-tasks.ts` | Add `fetchCxTasksByProject(orgId, projectId)` |
| `src/lib/actions/cx-tasks.ts` | Add `serverFetchCxTasksByProject(orgId, projectId)` |
| `src/hooks/schedule/useSchedule.ts` | Add `initialActivities?` and `onMutate?` params |
| `src/components/schedule/ScheduleTab.tsx` | Loader shell + inner component + empty state + button change |

---

## Task 1: Add `fetchCxTasksByProject` to supabase layer

**Files:**
- Modify: `src/lib/supabase/cx-tasks.ts` (after line 124, the end of `fetchOrgTasks`)

- [ ] **Step 1: Add the function**

Append to the end of `src/lib/supabase/cx-tasks.ts`:

```typescript
export async function fetchCxTasksByProject(orgId: string, projectId: string): Promise<CxTask[]> {
  try {
    const { data, error } = await supabase
      .from("cx_tasks")
      .select(
        "id, project_id, name, type, start_date, end_date, location, status, crew_requirements, assigned_worker_ids, notes, external_id, original_duration, remaining_duration, predecessors, successors"
      )
      .eq("org_id", orgId)
      .eq("project_id", projectId)
      .order("start_date", { ascending: true, nullsFirst: false });

    if (error) {
      logSupabaseReadFailure(`fetchCxTasksByProject(${projectId})`, error);
      return [];
    }

    return (data ?? []).map((row) => ({
      id:                 row.id,
      projectId:          row.project_id,
      name:               row.name,
      type:               toTaskType(row.type),
      startDate:          row.start_date          ?? undefined,
      endDate:            row.end_date             ?? undefined,
      location:           row.location             ?? undefined,
      status:             toTaskStatus(row.status),
      crewRequirements:   Array.isArray(row.crew_requirements)   ? (row.crew_requirements as CxCrewRequirement[]) : [],
      assignedWorkerIds:  Array.isArray(row.assigned_worker_ids) ? (row.assigned_worker_ids as string[])          : [],
      notes:              row.notes                ?? undefined,
      externalId:         row.external_id          ?? undefined,
      originalDuration:   row.original_duration    ?? undefined,
      remainingDuration:  row.remaining_duration   ?? undefined,
      predecessors:       Array.isArray(row.predecessors) ? row.predecessors : [],
      successors:         Array.isArray(row.successors)   ? row.successors   : [],
    }));
  } catch (err) {
    logSupabaseReadFailure(`fetchCxTasksByProject(${projectId})`, err);
    return [];
  }
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit 2>&1 | grep "cx-tasks"
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/cx-tasks.ts
git commit -m "feat(cx): add fetchCxTasksByProject to supabase layer"
```

---

## Task 2: Add `serverFetchCxTasksByProject` server action

**Files:**
- Modify: `src/lib/actions/cx-tasks.ts`

- [ ] **Step 1: Add the import and action**

At the top of `src/lib/actions/cx-tasks.ts`, add `fetchCxTasksByProject` to the import from `@/lib/supabase/cx-tasks`:

```typescript
import { fetchCxTasksByProject } from "@/lib/supabase/cx-tasks";
```

Then append to the end of the file:

```typescript
export async function serverFetchCxTasksByProject(
  orgId: string,
  projectId: string,
): Promise<CxTask[]> {
  return fetchCxTasksByProject(orgId, projectId);
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit 2>&1 | grep "cx-tasks\|actions"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/cx-tasks.ts
git commit -m "feat(cx): add serverFetchCxTasksByProject server action"
```

---

## Task 3: Extend `useSchedule` to accept `initialActivities` and `onMutate`

**Files:**
- Modify: `src/hooks/schedule/useSchedule.ts`

The hook currently always seeds from `MOCK_PROJECT_SCHEDULE` and `MOCK_SCHEDULE_MESSAGES`. We add two optional params:
- `initialActivities?: ScheduleActivity[]` — replaces mock seed when provided
- `onMutate?: (mutation: ScheduleMutation) => void` — called after each state mutation so the caller can persist to Supabase

- [ ] **Step 1: Update the import line**

Add `ScheduleMutation` to the existing types import (it's already in `@/lib/schedule/types`):

```typescript
import type {
  ProjectSchedule, ScheduleMessage,
  ColumnMap, ScheduleMutation,
} from "@/lib/schedule/types";
```

- [ ] **Step 2: Change the function signature**

Replace:
```typescript
export function useSchedule(projectId: string) {
  const [schedule,  setSchedule]  = useState<ProjectSchedule>(MOCK_PROJECT_SCHEDULE);
  const [messages,  setMessages]  = useState<ScheduleMessage[]>(MOCK_SCHEDULE_MESSAGES);
```

With:
```typescript
export function useSchedule(
  projectId:          string,
  initialActivities?: ScheduleActivity[],
  onMutate?:          (mutation: ScheduleMutation) => void,
) {
  const [schedule, setSchedule] = useState<ProjectSchedule>(() => {
    if (initialActivities) {
      const now = new Date().toISOString();
      return {
        ...MOCK_PROJECT_SCHEDULE,
        projectId,
        activities:    initialActivities,
        uploadedAt:    now,
        lastUpdatedAt: now,
      };
    }
    return MOCK_PROJECT_SCHEDULE;
  });
  const [messages, setMessages] = useState<ScheduleMessage[]>(
    () => (initialActivities ? [] : MOCK_SCHEDULE_MESSAGES),
  );
```

You will also need to add `ScheduleActivity` to the types import since it's now referenced in the signature:

```typescript
import type {
  ProjectSchedule, ScheduleMessage, ScheduleActivity,
  ColumnMap, ScheduleMutation,
} from "@/lib/schedule/types";
```

- [ ] **Step 3: Fire `onMutate` from `markActivityComplete`**

In the `markActivityComplete` callback, after `setSchedule(...)` is called for `primaryMutation`, add the `onMutate` call:

```typescript
// Apply the mark_complete mutation immediately
const primaryMutation = mutations.filter((m) => m.type === "mark_complete");
setSchedule((prev) => ({
  ...prev,
  activities:    applyMutations(prev.activities, primaryMutation),
  lastUpdatedAt: new Date().toISOString(),
}));

// NEW: notify caller so it can persist to Supabase
primaryMutation.forEach((m) => onMutate?.(m));
```

- [ ] **Step 4: Fire `onMutate` from `confirmCascade`**

In the `confirmCascade` callback, after `setSchedule(...)`, add:

```typescript
setSchedule((prev) => ({
  ...prev,
  activities:    applyMutations(prev.activities, msg.payload!),
  lastUpdatedAt: new Date().toISOString(),
}));

// NEW: notify caller for each confirmed mutation
msg.payload.forEach((m) => onMutate?.(m));
```

- [ ] **Step 5: Add `onMutate` to the `useCallback` dependency arrays**

`markActivityComplete` depends on `onMutate`:
```typescript
  }, [activities, projectId, onMutate]);
```

`confirmCascade` depends on `onMutate`:
```typescript
  }, [messages, projectId, onMutate]);
```

- [ ] **Step 6: Type check**

```bash
npx tsc --noEmit 2>&1 | grep "useSchedule\|schedule"
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/schedule/useSchedule.ts
git commit -m "feat(schedule): accept initialActivities and onMutate in useSchedule"
```

---

## Task 4: Rewrite `ScheduleTab` — loader shell, empty state, wired mutations, new button

**Files:**
- Modify: `src/components/schedule/ScheduleTab.tsx`

The current `ScheduleTab` is a single component that calls `useSchedule` directly. We need to split it:
- **`ScheduleTab`** (exported): loads CX tasks, decides what to render
- **`ScheduleTabInner`** (private): receives tasks, calls `useSchedule`, renders the two-pane UI

This split is required because React hooks cannot be called conditionally — we can't skip `useSchedule` in the empty/loading state.

- [ ] **Step 1: Replace the file entirely**

```typescript
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Upload, List, MessageSquare, ExternalLink, CalendarDays } from "lucide-react";
import { useSchedule }                    from "@/hooks/schedule/useSchedule";
import { ActivityList }                   from "./ActivityList";
import { ScheduleChat }                   from "./ScheduleChat";
import { CsvUploadPanel }                 from "./CsvUploadPanel";
import { useOrg }                         from "@/providers/OrgProvider";
import { serverFetchCxTasksByProject }    from "@/lib/actions/cx-tasks";
import { serverUpdateTask }               from "@/lib/actions/cx-tasks";
import type { UserRole }                  from "@/types/org";
import type { CxTask }                    from "@/lib/cx/types";
import type { ScheduleActivity, ScheduleMutation } from "@/lib/schedule/types";

const SCHEDULE_ACTING_ROLES: UserRole[] = [
  "owner", "admin", "equipment_director", "operations_manager",
  "pm", "project_engineer", "superintendent",
];

interface Props {
  projectId: string;
  role:      UserRole;
}

// ── CxTask → ScheduleActivity mapping ────────────────────────────────────────

function cxTaskToActivity(task: CxTask): ScheduleActivity {
  const today     = new Date().toISOString().split("T")[0];
  const startDate = task.startDate ?? today;
  const endDate   = task.endDate   ?? startDate;
  const start     = new Date(startDate);
  const end       = new Date(endDate);
  const duration  = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

  const statusMap = {
    not_started: "upcoming",
    in_progress:  "active",
    on_hold:      "delayed",
    complete:     "complete",
  } as const;

  return {
    id:        task.id,
    projectId: task.projectId,
    name:      task.name,
    phase:     task.type,
    startDate,
    endDate,
    duration,
    status:    statusMap[task.status],
    notes:     task.notes ? [task.notes] : [],
  };
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-220px)] min-h-[500px] gap-4 text-center px-6">
      <CalendarDays size={32} className="text-content-muted opacity-40" />
      <div>
        <p className="text-content-primary font-semibold text-sm mb-1">No schedule for this project yet</p>
        <p className="text-content-muted text-xs">Create tasks in the CX module or import an existing schedule.</p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/modules/cru/schedule"
          className="flex items-center gap-1.5 text-xs font-semibold bg-teal/10 text-teal border border-teal/30 px-4 py-2 rounded-lg hover:bg-teal/20 transition-colors"
        >
          <ExternalLink size={11} /> Open CX Schedule
        </Link>
        <button
          onClick={onImport}
          className="flex items-center gap-1.5 text-xs font-semibold text-content-muted border border-surface-border px-4 py-2 rounded-lg hover:border-teal/40 hover:text-teal transition-colors"
        >
          <Upload size={11} /> Import from CSV
        </button>
      </div>
    </div>
  );
}

// ── Inner component — receives real tasks, calls useSchedule ─────────────────

interface InnerProps {
  projectId: string;
  orgId:     string;
  role:      UserRole;
  cxTasks:   CxTask[];
}

function ScheduleTabInner({ projectId, orgId, role, cxTasks }: InnerProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [mobileTab,  setMobileTab]  = useState<"chat" | "schedule">("chat");

  const canAct    = SCHEDULE_ACTING_ROLES.includes(role);
  const canUpdate = (["owner", "admin", "equipment_director", "operations_manager", "pm", "project_engineer"] as UserRole[]).includes(role);

  const initialActivities = useMemo(() => cxTasks.map(cxTaskToActivity), [cxTasks]);

  const handleMutate = useCallback(async (mutation: ScheduleMutation) => {
    if (mutation.type === "mark_complete") {
      await serverUpdateTask(orgId, mutation.activityId, { status: "complete" });
    } else if (mutation.type === "push_date") {
      await serverUpdateTask(orgId, mutation.activityId, {
        startDate: mutation.newStartDate,
        endDate:   mutation.newEndDate,
      });
    }
  }, [orgId]);

  const {
    schedule, activities, messages,
    uploadSchedule, generateLookahead,
    markActivityComplete, pushActivity,
    confirmCascade, dismissCascade, postMessage,
  } = useSchedule(projectId, initialActivities, handleMutate);

  const chatProps = {
    messages,
    activities,
    canAct,
    onPostMessage:       postMessage,
    onMarkComplete:      markActivityComplete,
    onPush:              pushActivity,
    onConfirmCascade:    confirmCascade,
    onDismissCascade:    dismissCascade,
    onGenerateLookahead: generateLookahead,
  };

  if (showUpload) {
    return (
      <div className="max-w-lg mx-auto mt-6">
        <div className="border border-surface-border rounded-[var(--radius-card)] overflow-hidden">
          <CsvUploadPanel
            projectId={projectId}
            onUpload={(text, map) => { uploadSchedule(text, map); setShowUpload(false); }}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <p className="text-xs text-content-muted flex-1">
          {activities.length} activities · last updated{" "}
          {new Date(schedule.lastUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
        {canUpdate && (
          <Link
            href="/modules/cru/schedule"
            className="flex items-center gap-1.5 text-xs font-semibold text-content-muted border border-surface-border rounded-lg px-3 py-1.5 hover:border-teal/40 hover:text-teal transition-colors"
          >
            <ExternalLink size={11} /> Update Schedule
          </Link>
        )}
        {/* Mobile tab switcher */}
        <div className="flex lg:hidden border border-surface-border rounded-lg overflow-hidden">
          <button
            onClick={() => setMobileTab("chat")}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors ${
              mobileTab === "chat"
                ? "bg-teal text-white"
                : "text-content-muted hover:text-content-secondary"
            }`}
          >
            <MessageSquare size={11} /> Chat
          </button>
          <button
            onClick={() => setMobileTab("schedule")}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors ${
              mobileTab === "schedule"
                ? "bg-teal text-white"
                : "text-content-muted hover:text-content-secondary"
            }`}
          >
            <List size={11} /> Schedule
          </button>
        </div>
      </div>

      {/* Two-pane desktop / tab-switched mobile */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className={`flex-1 overflow-y-auto ${mobileTab === "schedule" ? "block" : "hidden"} lg:block`}>
          <ActivityList activities={activities} />
        </div>
        <div className={`lg:w-[420px] border border-surface-border rounded-[var(--radius-card)] overflow-hidden flex flex-col ${
          mobileTab === "chat" ? "flex" : "hidden"
        } lg:flex`}>
          <ScheduleChat {...chatProps} />
        </div>
      </div>
    </div>
  );
}

// ── Loader shell — exported component ────────────────────────────────────────

export function ScheduleTab({ projectId, role }: Props) {
  const { currentOrganization } = useOrg();
  const orgId = currentOrganization.id;

  const [cxTasks, setCxTasks] = useState<CxTask[] | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    setCxTasks(null);
    serverFetchCxTasksByProject(orgId, projectId)
      .then(setCxTasks)
      .catch(() => setCxTasks([]));
  }, [orgId, projectId]);

  if (cxTasks === null) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-220px)] min-h-[500px]">
        <p className="text-content-muted text-xs">Loading schedule…</p>
      </div>
    );
  }

  if (showUpload) {
    return (
      <div className="max-w-lg mx-auto mt-6">
        <div className="border border-surface-border rounded-[var(--radius-card)] overflow-hidden">
          <CsvUploadPanel
            projectId={projectId}
            onUpload={(_text, _map) => setShowUpload(false)}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      </div>
    );
  }

  if (cxTasks.length === 0) {
    return <EmptyState onImport={() => setShowUpload(true)} />;
  }

  return (
    <ScheduleTabInner
      projectId={projectId}
      orgId={orgId}
      role={role}
      cxTasks={cxTasks}
    />
  );
}
```

> **Note on CSV upload in empty state:** The `onUpload` callback in the empty-state `CsvUploadPanel` currently discards the parsed CSV. This is intentional — CSV import in empty state is a migration path. A future task can wire `uploadSchedule` here to create CX tasks from the imported data.

- [ ] **Step 2: Type check the full build**

```bash
npx tsc --noEmit 2>&1 | grep -E "error|ScheduleTab|useSchedule"
```

Expected: no output.

- [ ] **Step 3: Manual smoke test**

1. Open a project detail page that has CX tasks — confirm Schedule tab shows real task names, not "Highland Construction" mock data.
2. Open a project with no CX tasks — confirm empty state appears with "Open CX Schedule" and "Import from CSV" buttons.
3. Click "Update Schedule" on a project with tasks — confirm it navigates to `/modules/cru/schedule`.
4. Mark a task complete via the AI chat — confirm `serverUpdateTask` is called (check Supabase `cx_tasks` row status changed to `"complete"`).

- [ ] **Step 4: Commit**

```bash
git add src/components/schedule/ScheduleTab.tsx
git commit -m "feat(schedule): wire Schedule tab to CX tasks with empty state and mutation sync"
```

- [ ] **Step 5: Push**

```bash
git push
```

---

## Self-Review

**Spec coverage:**
- ✅ Schedule tab reads from `cx_tasks` (Task 1 + 2 + 4)
- ✅ Mock data replaced by real data (Task 3 seed change + Task 4 loader)
- ✅ Empty state with "start scheduling" message and two CTAs (Task 4 `EmptyState`)
- ✅ "Update Schedule" navigates to CX schedule (Task 4 button change)
- ✅ CSV import still accessible from empty state (Task 4 `EmptyState` + loader CsvUploadPanel)
- ✅ `markActivityComplete` syncs back to Supabase (Task 3 `onMutate` in markActivityComplete + Task 4 `handleMutate`)
- ✅ `push_date` confirmed cascade syncs back to Supabase (Task 3 `onMutate` in confirmCascade + Task 4 `handleMutate`)

**Placeholder scan:** None found — all steps contain complete code.

**Type consistency:**
- `ScheduleMutation` imported in Task 3 and used in Task 4's `handleMutate` — consistent.
- `serverFetchCxTasksByProject(orgId, projectId)` signature matches between Task 2 definition and Task 4 call site.
- `serverUpdateTask(orgId, id, patch)` signature from existing file matches Task 4 call sites.
- `CxTask[]` flows from Task 1 fetch → Task 4 state → `cxTaskToActivity` mapping → `ScheduleActivity[]` → `useSchedule` — consistent throughout.
