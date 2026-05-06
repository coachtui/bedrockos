# CX Tasks + Day Assignments — Supabase Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist `cx_tasks` and `cx_day_assignments` in Supabase so tasks and worker day-assignments created through the UI survive browser refreshes, unblocking real demo data for the upcoming civil buyer demo.

**Architecture:** Follow the established shell pattern — server component fetches at layout level, passes initial data as props through `ShellClientRoot` → `CxProvider`, client-side mutations dispatch to local reducer first (optimistic) then fire server actions async. Events stay mock for now.

**Tech Stack:** Next.js App Router, Supabase (service role key, no RLS), `"use server"` actions, existing `@/lib/supabase/server` client.

---

## File Map

| File | Change |
|------|--------|
| `supabase/migrations/20260503_cx_tasks.sql` | New — DDL for cx_tasks table |
| `supabase/migrations/20260503_cx_day_assignments.sql` | New — DDL for cx_day_assignments table |
| `src/lib/supabase/cx-tasks.ts` | New — `fetchOrgTasks(orgId)` |
| `src/lib/supabase/cx-assignments.ts` | New — `fetchOrgAssignments(orgId)` |
| `src/lib/actions/cx-tasks.ts` | New — `serverCreateTask`, `serverBulkCreateTasks`, `serverUpdateTask` |
| `src/lib/actions/cx-assignments.ts` | New — `serverCreateAssignment`, `serverRemoveAssignment` |
| `src/providers/CxProvider.tsx` | Modify — accept `initialTasks`/`initialAssignments` props, wire mutations to server actions |
| `src/app/(shell)/shell-client.tsx` | Modify — add `initialTasks`/`initialAssignments` to `ShellClientRoot` props, pass to `CxProvider` |
| `src/app/(shell)/layout.tsx` | Modify — add `fetchOrgTasks` + `fetchOrgAssignments` to parallel fetch, pass to `ShellClientRoot` |
| `supabase/seed-civil-demo.sql` | New — civil demo data: project + tasks spanning this week + day assignments |

---

## Task 1: cx_tasks migration SQL

**Files:**
- Create: `supabase/migrations/20260503_cx_tasks.sql`

- [ ] **Create the migrations directory and SQL file**

```bash
mkdir -p supabase/migrations
```

Create `supabase/migrations/20260503_cx_tasks.sql`:

```sql
create table cx_tasks (
  id                   text        primary key,
  org_id               text        not null,
  project_id           text        not null,
  name                 text        not null,
  type                 text        not null,
  start_date           date,
  end_date             date,
  location             text,
  status               text        not null default 'not_started',
  crew_requirements    jsonb       not null default '[]'::jsonb,
  assigned_worker_ids  text[]      not null default '{}',
  notes                text,
  external_id          text,
  created_at           timestamptz not null default now()
);

create index cx_tasks_org_id_idx on cx_tasks(org_id);
```

- [ ] **Apply migration in Supabase SQL editor**

Open your Supabase project → SQL Editor → paste the contents of `20260503_cx_tasks.sql` → Run.

Expected: no error, `cx_tasks` appears in Table Editor.

- [ ] **Commit**

```bash
git add supabase/migrations/20260503_cx_tasks.sql
git commit -m "feat(cx): add cx_tasks Supabase table migration"
```

---

## Task 2: cx_day_assignments migration SQL

**Files:**
- Create: `supabase/migrations/20260503_cx_day_assignments.sql`

- [ ] **Create the SQL file**

Create `supabase/migrations/20260503_cx_day_assignments.sql`:

```sql
create table cx_day_assignments (
  id          text        primary key,
  org_id      text        not null,
  worker_id   text        not null,
  project_id  text        not null,
  date        date        not null,
  created_at  timestamptz not null default now(),
  unique (org_id, worker_id, date)
);

create index cx_day_assignments_org_id_idx on cx_day_assignments(org_id);
```

The unique constraint on `(org_id, worker_id, date)` enforces one assignment per worker per day — matching the duplicate-check already in `CxProvider.addAssignment`.

- [ ] **Apply migration in Supabase SQL editor**

Paste contents → Run.

Expected: no error, `cx_day_assignments` appears in Table Editor.

- [ ] **Commit**

```bash
git add supabase/migrations/20260503_cx_day_assignments.sql
git commit -m "feat(cx): add cx_day_assignments Supabase table migration"
```

---

## Task 3: fetchOrgTasks

**Files:**
- Create: `src/lib/supabase/cx-tasks.ts`

- [ ] **Create the fetch function**

Create `src/lib/supabase/cx-tasks.ts`:

```typescript
import "server-only";
import { supabase } from "./server";
import type { CxTask, CxTaskType, CxTaskStatus, CxCrewRequirement } from "@/lib/cx/types";

const KNOWN_TASK_TYPES = new Set<CxTaskType>([
  "pour", "inspection", "delivery", "grading", "concrete",
  "framing", "electrical", "excavation", "utility", "paving", "demolition", "other",
]);

const KNOWN_TASK_STATUSES = new Set<CxTaskStatus>([
  "not_started", "in_progress", "on_hold", "complete",
]);

function toTaskType(t: string): CxTaskType {
  return KNOWN_TASK_TYPES.has(t as CxTaskType) ? (t as CxTaskType) : "other";
}

function toTaskStatus(s: string): CxTaskStatus {
  return KNOWN_TASK_STATUSES.has(s as CxTaskStatus) ? (s as CxTaskStatus) : "not_started";
}

export async function fetchOrgTasks(orgId: string): Promise<CxTask[]> {
  try {
    const { data, error } = await supabase
      .from("cx_tasks")
      .select("id, project_id, name, type, start_date, end_date, location, status, crew_requirements, assigned_worker_ids, notes, external_id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    return data.map((row) => ({
      id:                row.id,
      projectId:         row.project_id,
      name:              row.name,
      type:              toTaskType(row.type),
      startDate:         row.start_date   ?? undefined,
      endDate:           row.end_date     ?? undefined,
      location:          row.location     ?? undefined,
      status:            toTaskStatus(row.status),
      crewRequirements:  Array.isArray(row.crew_requirements)   ? (row.crew_requirements as CxCrewRequirement[]) : [],
      assignedWorkerIds: Array.isArray(row.assigned_worker_ids) ? (row.assigned_worker_ids as string[])          : [],
      notes:             row.notes       ?? undefined,
      externalId:        row.external_id ?? undefined,
    }));
  } catch {
    return [];
  }
}
```

- [ ] **Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error TS|Type error" | head -20
```

Expected: no errors in the new file.

- [ ] **Commit**

```bash
git add src/lib/supabase/cx-tasks.ts
git commit -m "feat(cx): add fetchOrgTasks Supabase fetch function"
```

---

## Task 4: fetchOrgAssignments

**Files:**
- Create: `src/lib/supabase/cx-assignments.ts`

- [ ] **Create the fetch function**

Create `src/lib/supabase/cx-assignments.ts`:

```typescript
import "server-only";
import { supabase } from "./server";
import type { CxDayAssignment } from "@/lib/cx/types";

export async function fetchOrgAssignments(orgId: string): Promise<CxDayAssignment[]> {
  try {
    const { data, error } = await supabase
      .from("cx_day_assignments")
      .select("id, worker_id, project_id, date")
      .eq("org_id", orgId)
      .order("date", { ascending: true });

    if (error || !data) return [];

    return data.map((row) => ({
      id:        row.id,
      workerId:  row.worker_id,
      projectId: row.project_id,
      date:      row.date,
    }));
  } catch {
    return [];
  }
}
```

- [ ] **Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error TS|Type error" | head -20
```

Expected: no errors.

- [ ] **Commit**

```bash
git add src/lib/supabase/cx-assignments.ts
git commit -m "feat(cx): add fetchOrgAssignments Supabase fetch function"
```

---

## Task 5: Server actions for cx_tasks

**Files:**
- Create: `src/lib/actions/cx-tasks.ts`

- [ ] **Create the server actions file**

Create `src/lib/actions/cx-tasks.ts`:

```typescript
"use server";

import { supabase } from "@/lib/supabase/server";
import type { CxTask } from "@/lib/cx/types";

function toRow(orgId: string, task: CxTask) {
  return {
    id:                  task.id,
    org_id:              orgId,
    project_id:          task.projectId,
    name:                task.name,
    type:                task.type,
    start_date:          task.startDate          ?? null,
    end_date:            task.endDate            ?? null,
    location:            task.location           ?? null,
    status:              task.status,
    crew_requirements:   task.crewRequirements,
    assigned_worker_ids: task.assignedWorkerIds,
    notes:               task.notes              ?? null,
    external_id:         task.externalId         ?? null,
  };
}

export async function serverCreateTask(orgId: string, task: CxTask): Promise<void> {
  await supabase.from("cx_tasks").insert(toRow(orgId, task));
}

export async function serverBulkCreateTasks(orgId: string, tasks: CxTask[]): Promise<void> {
  if (tasks.length === 0) return;
  await supabase.from("cx_tasks").insert(tasks.map((t) => toRow(orgId, t)));
}

export async function serverUpdateTask(id: string, patch: Partial<CxTask>): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.name              !== undefined) update.name                = patch.name;
  if (patch.type              !== undefined) update.type                = patch.type;
  if (patch.startDate         !== undefined) update.start_date          = patch.startDate ?? null;
  if (patch.endDate           !== undefined) update.end_date            = patch.endDate   ?? null;
  if (patch.location          !== undefined) update.location            = patch.location  ?? null;
  if (patch.status            !== undefined) update.status              = patch.status;
  if (patch.crewRequirements  !== undefined) update.crew_requirements   = patch.crewRequirements;
  if (patch.assignedWorkerIds !== undefined) update.assigned_worker_ids = patch.assignedWorkerIds;
  if (patch.notes             !== undefined) update.notes               = patch.notes     ?? null;
  if (Object.keys(update).length === 0) return;
  await supabase.from("cx_tasks").update(update).eq("id", id);
}
```

- [ ] **Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error TS|Type error" | head -20
```

Expected: no errors.

- [ ] **Commit**

```bash
git add src/lib/actions/cx-tasks.ts
git commit -m "feat(cx): add serverCreateTask, serverBulkCreateTasks, serverUpdateTask actions"
```

---

## Task 6: Server actions for cx_day_assignments

**Files:**
- Create: `src/lib/actions/cx-assignments.ts`

- [ ] **Create the server actions file**

Create `src/lib/actions/cx-assignments.ts`:

```typescript
"use server";

import { supabase } from "@/lib/supabase/server";
import type { CxDayAssignment } from "@/lib/cx/types";

export async function serverCreateAssignment(orgId: string, assignment: CxDayAssignment): Promise<void> {
  await supabase.from("cx_day_assignments").insert({
    id:         assignment.id,
    org_id:     orgId,
    worker_id:  assignment.workerId,
    project_id: assignment.projectId,
    date:       assignment.date,
  });
}

export async function serverRemoveAssignment(id: string): Promise<void> {
  await supabase.from("cx_day_assignments").delete().eq("id", id);
}
```

- [ ] **Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error TS|Type error" | head -20
```

Expected: no errors.

- [ ] **Commit**

```bash
git add src/lib/actions/cx-assignments.ts
git commit -m "feat(cx): add serverCreateAssignment and serverRemoveAssignment actions"
```

---

## Task 7: Update CxProvider — initial props + server action wiring

**Files:**
- Modify: `src/providers/CxProvider.tsx`

- [ ] **Replace CxProvider with the version below**

Full replacement of `src/providers/CxProvider.tsx`:

```typescript
"use client";

import React, { createContext, useContext, useReducer } from "react";
import type { CxTask, CxEvent, CxDayAssignment, CreateCxTaskInput } from "@/lib/cx/types";
import { MOCK_CX_EVENTS } from "@/lib/cx/mock-data";
import { serverCreateTask, serverBulkCreateTasks, serverUpdateTask } from "@/lib/actions/cx-tasks";
import { serverCreateAssignment, serverRemoveAssignment } from "@/lib/actions/cx-assignments";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

interface CxState {
  tasks:       CxTask[];
  events:      CxEvent[];
  assignments: CxDayAssignment[];
}

type CxAction =
  | { type: "ADD_TASK";          task:       CxTask }
  | { type: "ADD_TASKS";         tasks:      CxTask[] }
  | { type: "UPDATE_TASK";       id:         string; patch: Partial<CxTask> }
  | { type: "ADD_EVENT";         event:      CxEvent }
  | { type: "ADD_ASSIGNMENT";    assignment: CxDayAssignment }
  | { type: "REMOVE_ASSIGNMENT"; id:         string };

function cxReducer(state: CxState, action: CxAction): CxState {
  switch (action.type) {
    case "ADD_TASK":
      return { ...state, tasks: [...state.tasks, action.task] };

    case "ADD_TASKS":
      return { ...state, tasks: [...state.tasks, ...action.tasks] };

    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, ...action.patch } : t,
        ),
      };

    case "ADD_EVENT":
      return { ...state, events: [...state.events, action.event] };

    case "ADD_ASSIGNMENT":
      return { ...state, assignments: [...state.assignments, action.assignment] };

    case "REMOVE_ASSIGNMENT":
      return { ...state, assignments: state.assignments.filter((a) => a.id !== action.id) };

    default:
      return state;
  }
}

interface CxContextValue {
  tasks:            CxTask[];
  events:           CxEvent[];
  assignments:      CxDayAssignment[];
  addTask:          (input: CreateCxTaskInput) => CxTask;
  addTasks:         (inputs: CreateCxTaskInput[]) => CxTask[];
  updateTask:       (id: string, patch: Partial<CxTask>) => void;
  addEvent:         (input: Omit<CxEvent, "id">) => CxEvent;
  addAssignment:    (input: Omit<CxDayAssignment, "id">) => CxDayAssignment;
  removeAssignment: (id: string) => void;
}

const CxContext = createContext<CxContextValue | null>(null);

export function CxProvider({
  children,
  initialTasks       = [],
  initialAssignments = [],
}: {
  children:           React.ReactNode;
  initialTasks?:      CxTask[];
  initialAssignments?: CxDayAssignment[];
}) {
  const [state, dispatch] = useReducer(cxReducer, {
    tasks:       initialTasks,
    events:      MOCK_CX_EVENTS,
    assignments: initialAssignments,
  });

  function addTask(input: CreateCxTaskInput): CxTask {
    const task: CxTask = { ...input, id: crypto.randomUUID() };
    dispatch({ type: "ADD_TASK", task });
    void serverCreateTask(ORG_ID, task);
    return task;
  }

  function addTasks(inputs: CreateCxTaskInput[]): CxTask[] {
    const tasks: CxTask[] = inputs.map((input) => ({ ...input, id: crypto.randomUUID() }));
    dispatch({ type: "ADD_TASKS", tasks });
    void serverBulkCreateTasks(ORG_ID, tasks);
    return tasks;
  }

  function updateTask(id: string, patch: Partial<CxTask>) {
    dispatch({ type: "UPDATE_TASK", id, patch });
    void serverUpdateTask(id, patch);
  }

  function addEvent(input: Omit<CxEvent, "id">): CxEvent {
    const event: CxEvent = { ...input, id: `cx_evt_${Date.now()}` };
    dispatch({ type: "ADD_EVENT", event });
    return event;
  }

  function addAssignment(input: Omit<CxDayAssignment, "id">): CxDayAssignment {
    const existing = state.assignments.find(
      (a) => a.workerId === input.workerId && a.date === input.date,
    );
    if (existing) return existing;
    const assignment: CxDayAssignment = { ...input, id: crypto.randomUUID() };
    dispatch({ type: "ADD_ASSIGNMENT", assignment });
    void serverCreateAssignment(ORG_ID, assignment);
    return assignment;
  }

  function removeAssignment(id: string) {
    dispatch({ type: "REMOVE_ASSIGNMENT", id });
    void serverRemoveAssignment(id);
  }

  return (
    <CxContext.Provider value={{ ...state, addTask, addTasks, updateTask, addEvent, addAssignment, removeAssignment }}>
      {children}
    </CxContext.Provider>
  );
}

export function useCx(): CxContextValue {
  const ctx = useContext(CxContext);
  if (!ctx) throw new Error("useCx must be used inside CxProvider");
  return ctx;
}
```

- [ ] **Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error TS|Type error" | head -20
```

Expected: no errors.

- [ ] **Commit**

```bash
git add src/providers/CxProvider.tsx
git commit -m "feat(cx): wire CxProvider to Supabase — initial props + server action mutations"
```

---

## Task 8: Thread CX data through shell layout + ShellClientRoot

**Files:**
- Modify: `src/app/(shell)/layout.tsx`
- Modify: `src/app/(shell)/shell-client.tsx`

- [ ] **Update shell layout to fetch tasks and assignments**

Replace `src/app/(shell)/layout.tsx` with:

```typescript
import { fetchOrgWorkers }     from "@/lib/supabase/workers";
import { fetchOrgProjects }    from "@/lib/supabase/projects";
import { fetchOrgCrews }       from "@/lib/supabase/crews";
import { fetchOrgTasks }       from "@/lib/supabase/cx-tasks";
import { fetchOrgAssignments } from "@/lib/supabase/cx-assignments";
import { fetchOrgUser }        from "@/lib/supabase/org-users";
import { getSessionUser }      from "@/lib/supabase/ssr";
import { ShellClientRoot }     from "./shell-client";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export default async function ShellRootLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getSessionUser();

  const [workers, projects, crews, tasks, assignments] = await Promise.all([
    fetchOrgWorkers(ORG_ID),
    fetchOrgProjects(ORG_ID),
    fetchOrgCrews(ORG_ID),
    fetchOrgTasks(ORG_ID),
    fetchOrgAssignments(ORG_ID),
  ]);

  const orgUser = sessionUser
    ? await fetchOrgUser(ORG_ID, sessionUser.id)
    : null;

  return (
    <ShellClientRoot
      initialWorkers={workers}
      initialProjects={projects}
      initialCrews={crews}
      initialTasks={tasks}
      initialAssignments={assignments}
      initialUser={orgUser ?? undefined}
    >
      {children}
    </ShellClientRoot>
  );
}
```

- [ ] **Update ShellClientRoot to accept and pass CX initial data**

Replace `src/app/(shell)/shell-client.tsx` with:

```typescript
"use client";

import { OrgProvider }    from "@/providers/OrgProvider";
import { UIProvider }     from "@/providers/UIProvider";
import { MxProvider }     from "@/providers/MxProvider";
import { OpsProvider }    from "@/providers/OpsProvider";
import { CxProvider }     from "@/providers/CxProvider";
import { ThemeProvider }  from "@/providers/ThemeProvider";
import { Sidebar }        from "@/components/layout/Sidebar";
import { Topbar }         from "@/components/layout/Topbar";
import { MobileNav }      from "@/components/layout/MobileNav";
import { AssistantPanel } from "@/components/layout/AssistantPanel";
import { SearchModal }    from "@/components/search/SearchModal";
import { useUI }          from "@/providers/UIProvider";
import { useMx }          from "@/providers/MxProvider";
import type { OrgWorker, Project, OrgCrew } from "@/types/domain";
import type { OrgUserRow }                  from "@/lib/supabase/org-users";
import type { CxTask, CxDayAssignment }     from "@/lib/cx/types";

function OpsLayer({ children }: { children: React.ReactNode }) {
  const { createWorkOrder } = useMx();
  return (
    <OpsProvider onCreateMxWorkOrder={createWorkOrder}>
      {children}
    </OpsProvider>
  );
}

function ShellLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUI();
  return (
    <>
      <Sidebar />
      <Topbar />
      <main className={`min-h-screen pt-14 transition-all duration-200 ease-in-out pl-0 ${sidebarCollapsed ? "md:pl-16" : "md:pl-60"}`}>
        <div className="pb-20 md:pb-0">{children}</div>
      </main>
      <AssistantPanel />
      <SearchModal />
      <MobileNav />
    </>
  );
}

export function ShellClientRoot({
  children,
  initialWorkers,
  initialProjects,
  initialCrews,
  initialTasks,
  initialAssignments,
  initialUser,
}: {
  children:           React.ReactNode;
  initialWorkers:     OrgWorker[];
  initialProjects:    Project[];
  initialCrews:       OrgCrew[];
  initialTasks:       CxTask[];
  initialAssignments: CxDayAssignment[];
  initialUser?:       OrgUserRow;
}) {
  return (
    <ThemeProvider>
      <OrgProvider initialWorkers={initialWorkers} initialProjects={initialProjects} initialCrews={initialCrews} initialUser={initialUser}>
        <UIProvider>
          <CxProvider initialTasks={initialTasks} initialAssignments={initialAssignments}>
            <MxProvider>
              <OpsLayer>
                <ShellLayout>{children}</ShellLayout>
              </OpsLayer>
            </MxProvider>
          </CxProvider>
        </UIProvider>
      </OrgProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Run full build and verify no type errors**

```bash
npm run build 2>&1 | grep -E "error TS|Type error|Failed" | head -20
```

Expected: clean build.

- [ ] **Start dev server and verify CX loads with empty task list (Supabase tables are empty)**

```bash
npm run dev
```

Navigate to `/modules/cru/task-bank` — should show "No tasks" empty state (not the old mock tasks). Navigate to `/modules/cru/assignments` — should show an empty weekly grid. This confirms the provider is now reading from Supabase, not mock data.

- [ ] **Commit**

```bash
git add src/app/(shell)/layout.tsx src/app/(shell)/shell-client.tsx
git commit -m "feat(cx): thread Supabase tasks and assignments through shell layout"
```

---

## Task 9: Seed civil demo data

**Files:**
- Create: `supabase/seed-civil-demo.sql`

This seeds a civil project and tasks spanning the current week, plus day assignments for shared workers — giving the demo realistic data on every CX surface.

- [ ] **Get the org_id and a project_id for your civil project**

First, create a civil project via the UI (Projects → New Project). Name it something like "SR-99 Widening — Segment 4" with phase "Earthwork" and location matching your buyer's context.

After creating it, get its `id` from the Supabase projects table:

```sql
select id, name from projects order by created_at desc limit 5;
```

Copy the `id` of your new project — you'll use it as `<YOUR_PROJECT_ID>` below.

Also confirm your org_id:

```sql
select distinct org_id from projects limit 1;
```

- [ ] **Create and apply `supabase/seed-civil-demo.sql`**

Create `supabase/seed-civil-demo.sql` (substitute `<YOUR_ORG_ID>` and `<YOUR_PROJECT_ID>`):

```sql
-- Civil demo seed data — CX tasks spanning current week + day assignments
-- Substitute <YOUR_ORG_ID> and <YOUR_PROJECT_ID> before running.

insert into cx_tasks (id, org_id, project_id, name, type, start_date, end_date, location, status, crew_requirements, assigned_worker_ids, notes) values

-- Task active today through Friday
('cx_demo_001', '<YOUR_ORG_ID>', '<YOUR_PROJECT_ID>',
 'Subgrade Grading — Station 12+00 to 15+00', 'grading',
 '2026-05-03', '2026-05-07',
 'Station 12+00', 'in_progress',
 '[{"role":"operator","count":2},{"role":"laborer","count":3}]',
 '{}', 'Motor grader and compactor on site. Target grade tolerance ±0.05 ft.'),

-- Task starting tomorrow
('cx_demo_002', '<YOUR_ORG_ID>', '<YOUR_PROJECT_ID>',
 'Storm Drain Installation — Sta 13+50', 'utility',
 '2026-05-04', '2026-05-06',
 'Station 13+50', 'not_started',
 '[{"role":"operator","count":1},{"role":"laborer","count":4}]',
 '{}', 'Install 48-inch CMP with headwall. Shoring required.'),

-- Pour event mid-week
('cx_demo_003', '<YOUR_ORG_ID>', '<YOUR_PROJECT_ID>',
 'Concrete Curb & Gutter — Sta 12+00 to 14+00', 'pour',
 '2026-05-06', '2026-05-06',
 'Station 12+00 – 14+00', 'not_started',
 '[{"role":"mason","count":2},{"role":"laborer","count":3},{"role":"operator","count":1}]',
 '{}', '180 CY. Pump truck requested. Crew start 6:00 AM.'),

-- Inspection Friday
('cx_demo_004', '<YOUR_ORG_ID>', '<YOUR_PROJECT_ID>',
 'Compaction Testing — Subgrade Layer', 'inspection',
 '2026-05-07', '2026-05-07',
 'Stations 12+00 to 15+00', 'not_started',
 '[]', '{}', 'County inspector on site 9 AM. Nuclear gauge required.'),

-- Next week delivery
('cx_demo_005', '<YOUR_ORG_ID>', '<YOUR_PROJECT_ID>',
 'Aggregate Base Course Delivery', 'delivery',
 '2026-05-11', '2026-05-11',
 'Gate 1 staging area', 'not_started',
 '[]', '{}', '400 tons Class 2 aggregate. 14 loads from Hanson Quarry.');
```

Run in Supabase SQL editor. After running, verify in Table Editor that 5 rows appear in `cx_tasks`.

- [ ] **Refresh the app and verify tasks appear**

Navigate to `/modules/cru/task-bank` — should show all 5 tasks.
Navigate to `/modules/cru/schedule` — the Gantt should show tasks plotted this week.
Navigate to `/modules/cru/roster` — switch role to `foreman` via the role switcher in the topbar. The Foreman Today view should show the grading task (cx_demo_001, active today May 3).

- [ ] **Create a task via the UI and verify it persists**

In Task Bank, create a new task with a name like "Test persistence". Refresh the page. The task should still be there.

- [ ] **Seed day assignments (optional but recommended for Assignments view)**

Run in Supabase SQL editor (substitute `<YOUR_ORG_ID>`, `<YOUR_PROJECT_ID>`, and real worker IDs from your `workers` table):

```sql
-- Get worker IDs first:
-- select id, name, role from workers where org_id = '<YOUR_ORG_ID>' limit 20;

insert into cx_day_assignments (id, org_id, worker_id, project_id, date) values
('cxda_demo_001', '<YOUR_ORG_ID>', '<OPERATOR_WORKER_ID>', '<YOUR_PROJECT_ID>', '2026-05-03'),
('cxda_demo_002', '<YOUR_ORG_ID>', '<OPERATOR_WORKER_ID>', '<YOUR_PROJECT_ID>', '2026-05-04'),
('cxda_demo_003', '<YOUR_ORG_ID>', '<OPERATOR_WORKER_ID>', '<YOUR_PROJECT_ID>', '2026-05-05'),
('cxda_demo_004', '<YOUR_ORG_ID>', '<MASON_WORKER_ID>',    '<YOUR_PROJECT_ID>', '2026-05-06'),
('cxda_demo_005', '<YOUR_ORG_ID>', '<LABORER_WORKER_ID>',  '<YOUR_PROJECT_ID>', '2026-05-03'),
('cxda_demo_006', '<YOUR_ORG_ID>', '<LABORER_WORKER_ID>',  '<YOUR_PROJECT_ID>', '2026-05-04'),
('cxda_demo_007', '<YOUR_ORG_ID>', '<LABORER_WORKER_ID>',  '<YOUR_PROJECT_ID>', '2026-05-05');
```

Navigate to `/modules/cru/assignments` — workers should now appear in the weekly grid with this project highlighted for the seeded days.

- [ ] **Commit seed file**

```bash
git add supabase/seed-civil-demo.sql
git commit -m "feat(cx): add civil demo seed SQL for buyer demo"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Persist cx_tasks in Supabase | Tasks 1, 3, 5, 7, 8 |
| Persist cx_day_assignments in Supabase | Tasks 2, 4, 6, 7, 8 |
| Fetch at layout level, pass as initial props | Task 8 |
| Optimistic mutations → server actions | Task 7 |
| CxEvent stays mock | Task 7 (MOCK_CX_EVENTS kept) |
| Civil demo data for buyer demo | Task 9 |

**Type consistency:** `CxTask`, `CxDayAssignment`, `CxCrewRequirement` from `@/lib/cx/types` used consistently across all tasks. `fetchOrgTasks` returns `CxTask[]`, `CxProvider` accepts `CxTask[]` — match confirmed.

**No placeholders:** All code steps contain complete, runnable code.
