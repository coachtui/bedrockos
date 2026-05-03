# Project-Scoped Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow workers (e.g. an operator by trade) to be assigned as foreman or superintendent on a specific project, giving them scoped platform access only for that project.

**Architecture:** A new `worker_project_roles` junction table stores per-project leadership assignments (foreman/superintendent). The shell layout fetches the logged-in user's positions at page load and passes them through ShellClientRoot into OrgProvider. OrgProvider uses those positions to filter `availableProjects` to only the worker's assigned projects, and derives the active `role` from whichever project is currently selected. Admins assign positions from the WorkerInspectorPanel.

**Tech Stack:** Next.js App Router, Supabase (Postgres), TypeScript, React context (OrgProvider pattern). No new libraries needed.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/20260503_worker_project_roles.sql` | Create | DB table + `user_id` column on workers |
| `src/types/domain.ts` | Modify | Add `ProjectPosition`, `WorkerProjectRole` types; add `userId` to `OrgWorker` |
| `src/lib/supabase/worker-project-roles.ts` | Create | Fetch functions for positions |
| `src/lib/actions/worker-project-roles.ts` | Create | Server actions: assign/remove position, link worker↔user |
| `src/app/(shell)/layout.tsx` | Modify | Fetch org positions + session worker's positions at load |
| `src/app/(shell)/shell-client.tsx` | Modify | Thread new props to OrgProvider |
| `src/providers/OrgProvider.tsx` | Modify | State, mutations, role derivation, availableProjects filtering |
| `src/components/shell/WorkerInspectorPanel.tsx` | Modify | Project position assignment UI |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260503_worker_project_roles.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Link workers to Supabase auth users
alter table workers add column if not exists user_id uuid references auth.users(id);
create index if not exists workers_user_id_idx on workers(user_id);

-- Project-scoped leadership positions
create table if not exists worker_project_roles (
  id          text primary key default gen_random_uuid()::text,
  org_id      text not null,
  worker_id   text not null references workers(id) on delete cascade,
  project_id  text not null references projects(id) on delete cascade,
  position    text not null check (position in ('superintendent', 'foreman')),
  created_at  timestamptz not null default now(),
  unique(worker_id, project_id)
);

create index if not exists wpr_org_project_idx on worker_project_roles(org_id, project_id);
create index if not exists wpr_worker_idx on worker_project_roles(worker_id);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the `mcp__plugin_supabase_supabase__apply_migration` tool with the SQL above and name `worker_project_roles`. Confirm success — the tool returns the migration result.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260503_worker_project_roles.sql
git commit -m "feat(db): add worker_project_roles table and user_id to workers"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/types/domain.ts`

- [ ] **Step 1: Add `ProjectPosition` and `WorkerProjectRole` types**

In `src/types/domain.ts`, add after the `WorkerRole` type definition:

```typescript
export type ProjectPosition = "superintendent" | "foreman";

export interface WorkerProjectRole {
  id:        string;
  orgId:     string;
  workerId:  string;
  projectId: string;
  position:  ProjectPosition;
}
```

- [ ] **Step 2: Add `userId` to `OrgWorker`**

In the `OrgWorker` interface, change:
```typescript
// Before
userId:    string | null;
```
to:
```typescript
userId:    string | null;  // Supabase auth.users id — null until worker has a login
```
(It likely already has `userId: string | null` — verify it's present. If the field is missing, add it after `role`.)

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/domain.ts
git commit -m "feat(types): add ProjectPosition and WorkerProjectRole types"
```

---

## Task 3: Supabase Fetch Layer

**Files:**
- Create: `src/lib/supabase/worker-project-roles.ts`

- [ ] **Step 1: Create the file**

```typescript
import "server-only";
import { supabase } from "./server";
import type { WorkerProjectRole, ProjectPosition } from "@/types/domain";

const VALID: Set<ProjectPosition> = new Set(["superintendent", "foreman"]);

function toPosition(p: string): ProjectPosition {
  return VALID.has(p as ProjectPosition) ? (p as ProjectPosition) : "foreman";
}

function mapRow(row: Record<string, unknown>): WorkerProjectRole {
  return {
    id:        row.id as string,
    orgId:     row.org_id as string,
    workerId:  row.worker_id as string,
    projectId: row.project_id as string,
    position:  toPosition(row.position as string),
  };
}

/** All leadership assignments in the org — used to populate admin UI. */
export async function fetchOrgWorkerProjectRoles(orgId: string): Promise<WorkerProjectRole[]> {
  try {
    const { data, error } = await supabase
      .from("worker_project_roles")
      .select("id, org_id, worker_id, project_id, position")
      .eq("org_id", orgId);
    if (error || !data) return [];
    return data.map(mapRow);
  } catch {
    return [];
  }
}

/** Find the worker record linked to a Supabase auth user. */
export async function fetchWorkerByUserId(
  orgId: string,
  userId: string,
): Promise<{ id: string } | null> {
  try {
    const { data, error } = await supabase
      .from("workers")
      .select("id")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();
    if (error || !data) return null;
    return { id: data.id as string };
  } catch {
    return null;
  }
}

/** All project positions held by a specific worker — used at login to scope their access. */
export async function fetchWorkerPositions(workerId: string): Promise<WorkerProjectRole[]> {
  try {
    const { data, error } = await supabase
      .from("worker_project_roles")
      .select("id, org_id, worker_id, project_id, position")
      .eq("worker_id", workerId);
    if (error || !data) return [];
    return data.map(mapRow);
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/worker-project-roles.ts
git commit -m "feat(supabase): add worker-project-roles fetch layer"
```

---

## Task 4: Server Actions

**Files:**
- Create: `src/lib/actions/worker-project-roles.ts`

- [ ] **Step 1: Create the file**

```typescript
"use server";

import { supabase } from "@/lib/supabase/server";
import type { ProjectPosition } from "@/types/domain";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

/**
 * Assign or update a worker's leadership position on a project.
 * Replaces any existing position for this worker+project pair.
 */
export async function serverAssignProjectPosition(
  workerId: string,
  projectId: string,
  position: ProjectPosition,
): Promise<{ error?: string }> {
  // Remove any existing row first (handles the update case)
  await supabase
    .from("worker_project_roles")
    .delete()
    .eq("worker_id", workerId)
    .eq("project_id", projectId);

  const { error } = await supabase.from("worker_project_roles").insert({
    org_id:     ORG_ID,
    worker_id:  workerId,
    project_id: projectId,
    position,
  });
  if (error) return { error: error.message };
  return {};
}

/** Remove a worker's leadership position from a project. */
export async function serverRemoveProjectPosition(
  workerId: string,
  projectId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("worker_project_roles")
    .delete()
    .eq("worker_id", workerId)
    .eq("project_id", projectId);
  if (error) return { error: error.message };
  return {};
}

/** Link a worker record to a Supabase auth user (called when admin invites a field leader). */
export async function serverLinkWorkerUser(
  workerId: string,
  userId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("workers")
    .update({ user_id: userId })
    .eq("id", workerId);
  if (error) return { error: error.message };
  return {};
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/worker-project-roles.ts
git commit -m "feat(actions): add worker-project-roles server actions"
```

---

## Task 5: Thread Data Through Shell Layout → ShellClientRoot → OrgProvider

**Files:**
- Modify: `src/app/(shell)/layout.tsx`
- Modify: `src/app/(shell)/shell-client.tsx`
- Modify: `src/providers/OrgProvider.tsx`

### 5a: Update Shell Layout

- [ ] **Step 1: Add imports to `src/app/(shell)/layout.tsx`**

Add after the existing imports:
```typescript
import {
  fetchOrgWorkerProjectRoles,
  fetchWorkerByUserId,
  fetchWorkerPositions,
} from "@/lib/supabase/worker-project-roles";
import type { WorkerProjectRole } from "@/types/domain";
```

- [ ] **Step 2: Expand the `Promise.all` in `layout.tsx`**

Replace:
```typescript
const [workers, projects, crews, tasks, assignments] = await Promise.all([
  fetchOrgWorkers(ORG_ID),
  fetchOrgProjects(ORG_ID),
  fetchOrgCrews(ORG_ID),
  fetchOrgTasks(ORG_ID),
  fetchOrgAssignments(ORG_ID),
]);
```
With:
```typescript
const [workers, projects, crews, tasks, assignments, workerProjectRoles] = await Promise.all([
  fetchOrgWorkers(ORG_ID),
  fetchOrgProjects(ORG_ID),
  fetchOrgCrews(ORG_ID),
  fetchOrgTasks(ORG_ID),
  fetchOrgAssignments(ORG_ID),
  fetchOrgWorkerProjectRoles(ORG_ID),
]);
```

- [ ] **Step 3: Fetch session worker's positions in `layout.tsx`**

After the existing `const orgUser = ...` block, add:
```typescript
const sessionWorker = sessionUser
  ? await fetchWorkerByUserId(ORG_ID, sessionUser.id)
  : null;
const sessionWorkerPositions: WorkerProjectRole[] = sessionWorker
  ? await fetchWorkerPositions(sessionWorker.id)
  : [];
```

- [ ] **Step 4: Pass new props to `ShellClientRoot` in `layout.tsx`**

Add to the `<ShellClientRoot>` JSX:
```tsx
initialWorkerProjectRoles={workerProjectRoles}
initialWorkerPositions={sessionWorkerPositions}
```

### 5b: Update ShellClientRoot

- [ ] **Step 5: Add props to `shell-client.tsx`**

In `src/app/(shell)/shell-client.tsx`, add to the props destructure and type:
```typescript
// Add to props type:
initialWorkerProjectRoles: WorkerProjectRole[];
initialWorkerPositions:    WorkerProjectRole[];

// Add import:
import type { WorkerProjectRole } from "@/types/domain";
```

- [ ] **Step 6: Thread props to `OrgProvider` in `shell-client.tsx`**

In the `<OrgProvider>` JSX inside ShellClientRoot, add:
```tsx
initialWorkerProjectRoles={initialWorkerProjectRoles}
initialWorkerPositions={initialWorkerPositions}
```

### 5c: Update OrgProvider

- [ ] **Step 7: Add imports and props to `OrgProvider.tsx`**

Add import:
```typescript
import type { WorkerProjectRole, ProjectPosition } from "@/types/domain";
import {
  serverAssignProjectPosition,
  serverRemoveProjectPosition,
} from "@/lib/actions/worker-project-roles";
```

Add to the `OrgProvider` function props (both the destructure and the type annotation):
```typescript
initialWorkerProjectRoles?: WorkerProjectRole[];
initialWorkerPositions?:    WorkerProjectRole[];
```

- [ ] **Step 8: Add state in `OrgProvider.tsx`**

After the existing `useState` calls, add:
```typescript
const [workerProjectRoles, setWorkerProjectRoles] = useState<WorkerProjectRole[]>(
  initialWorkerProjectRoles ?? [],
);
// Session positions are stable — they don't change during the session.
// Stored as a plain value, not state.
const sessionPositions = initialWorkerPositions ?? [];
```

- [ ] **Step 9: Update `setCurrentProject` to derive role from session positions**

Replace:
```typescript
const setCurrentProject = useCallback((project: ProjectContext) => {
  setConfig((prev) => ({ ...prev, currentProject: project }));
}, []);
```
With:
```typescript
const setCurrentProject = useCallback((project: ProjectContext) => {
  setConfig((prev) => {
    const position = sessionPositions.find((p) => p.projectId === project.id);
    return {
      ...prev,
      currentProject: project,
      currentUser: position
        ? { ...prev.currentUser, role: position.position }
        : prev.currentUser,
    };
  });
}, [sessionPositions]);
```

- [ ] **Step 10: Update `availableProjects` derivation in `OrgProvider.tsx`**

Replace:
```typescript
const availableProjects: ProjectContext[] = projects.map((p) => ({
  id:   p.id,
  name: p.name,
  slug: p.slug,
}));
```
With:
```typescript
const allProjectContexts: ProjectContext[] = projects.map((p) => ({
  id:   p.id,
  name: p.name,
  slug: p.slug,
}));

// Field leaders (foreman/superintendent with project positions) only see their projects.
const availableProjects: ProjectContext[] = sessionPositions.length > 0
  ? allProjectContexts.filter((p) =>
      sessionPositions.some((sp) => sp.projectId === p.id),
    )
  : allProjectContexts;
```

- [ ] **Step 11: Add `assignProjectPosition` and `removeProjectPosition` functions**

Add these functions inside `OrgProvider`, after the existing worker mutations:
```typescript
function assignProjectPosition(
  workerId: string,
  projectId: string,
  position: ProjectPosition,
): void {
  setWorkerProjectRoles((prev) => {
    const without = prev.filter(
      (r) => !(r.workerId === workerId && r.projectId === projectId),
    );
    const newRow: WorkerProjectRole = {
      id:        `wpr_${workerId}_${projectId}`,
      orgId,
      workerId,
      projectId,
      position,
    };
    return [...without, newRow];
  });
  serverAssignProjectPosition(workerId, projectId, position);
}

function removeProjectPosition(workerId: string, projectId: string): void {
  setWorkerProjectRoles((prev) =>
    prev.filter(
      (r) => !(r.workerId === workerId && r.projectId === projectId),
    ),
  );
  serverRemoveProjectPosition(workerId, projectId);
}
```

- [ ] **Step 12: Add new items to `OrgContextValue` interface**

In the `OrgContextValue` interface (around line 28), add:
```typescript
workerProjectRoles:      WorkerProjectRole[];
assignProjectPosition:   (workerId: string, projectId: string, position: ProjectPosition) => void;
removeProjectPosition:   (workerId: string, projectId: string) => void;
```

- [ ] **Step 13: Add new items to the Provider value object**

In the `<OrgContext.Provider value={{...}}>` block, add:
```typescript
workerProjectRoles,
assignProjectPosition,
removeProjectPosition,
```

- [ ] **Step 14: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -40
```
Expected: no errors.

- [ ] **Step 15: Commit**

```bash
git add src/app/(shell)/layout.tsx src/app/(shell)/shell-client.tsx src/providers/OrgProvider.tsx
git commit -m "feat: thread worker project roles through shell layout and OrgProvider"
```

---

## Task 6: WorkerInspectorPanel — Project Position UI

**Files:**
- Modify: `src/components/shell/WorkerInspectorPanel.tsx`

This task adds a "Project Position" section visible only to admin/owner/pm users. It lets them assign or remove a foreman/superintendent position for the selected worker on any project.

- [ ] **Step 1: Add imports to `WorkerInspectorPanel.tsx`**

Add:
```typescript
import type { ProjectPosition, WorkerProjectRole } from "@/types/domain";
```

- [ ] **Step 2: Destructure new context values**

In the `useOrg()` destructure inside the component, add:
```typescript
const {
  // ... existing ...
  projects,
  workerProjectRoles,
  assignProjectPosition,
  removeProjectPosition,
} = useOrg();
```

- [ ] **Step 3: Add local state for the add-position form**

After the existing state declarations, add:
```typescript
const [showAddPosition, setShowAddPosition] = useState(false);
const [addPositionProjectId, setAddPositionProjectId] = useState("");
const [addPositionRole, setAddPositionRole] = useState<ProjectPosition>("foreman");
```

- [ ] **Step 4: Compute this worker's existing positions**

Add a derived value (not state — recalculated on each render):
```typescript
const workerPositions: WorkerProjectRole[] = worker
  ? workerProjectRoles.filter((r) => r.workerId === worker.id)
  : [];
```

- [ ] **Step 5: Add the position section handler**

```typescript
function handleAddPosition(): void {
  if (!worker || !addPositionProjectId) return;
  assignProjectPosition(worker.id, addPositionProjectId, addPositionRole);
  setAddPositionProjectId("");
  setAddPositionRole("foreman");
  setShowAddPosition(false);
}
```

- [ ] **Step 6: Add the "Project Position" UI section**

Add this section inside the panel's scrollable body, after the "Assignment" section and before the "Skills" section. Only render it when `canEdit` is true (existing pattern — `canEdit` gates admin-only sections):

```tsx
{canEdit && (
  <section className="border-t border-surface-border pt-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-medium text-content-secondary uppercase tracking-wide">
        Project Position
      </span>
      {!showAddPosition && (
        <button
          onClick={() => setShowAddPosition(true)}
          className="text-xs text-blue-brand hover:underline"
        >
          + Assign
        </button>
      )}
    </div>

    {/* Existing positions */}
    {workerPositions.length === 0 && !showAddPosition && (
      <p className="text-xs text-content-tertiary">No project positions assigned.</p>
    )}
    <ul className="space-y-1 mb-2">
      {workerPositions.map((pos) => {
        const project = projects.find((p) => p.id === pos.projectId);
        return (
          <li key={pos.id} className="flex items-center justify-between text-xs">
            <span className="text-content-primary">
              {project?.name ?? pos.projectId}
              <span className="ml-1 text-content-secondary capitalize">
                — {pos.position}
              </span>
            </span>
            <button
              onClick={() => worker && removeProjectPosition(worker.id, pos.projectId)}
              className="text-content-tertiary hover:text-red-500 ml-2"
              aria-label="Remove position"
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>

    {/* Add position form */}
    {showAddPosition && (
      <div className="space-y-2">
        <select
          value={addPositionProjectId}
          onChange={(e) => setAddPositionProjectId(e.target.value)}
          className="w-full text-xs border border-surface-border rounded px-2 py-1 bg-surface-base text-content-primary"
        >
          <option value="">Select project…</option>
          {projects
            .filter((p) => !workerPositions.some((r) => r.projectId === p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
        </select>
        <select
          value={addPositionRole}
          onChange={(e) => setAddPositionRole(e.target.value as ProjectPosition)}
          className="w-full text-xs border border-surface-border rounded px-2 py-1 bg-surface-base text-content-primary"
        >
          <option value="foreman">Foreman</option>
          <option value="superintendent">Superintendent</option>
        </select>
        <div className="flex gap-2">
          <button
            onClick={handleAddPosition}
            disabled={!addPositionProjectId}
            className="flex-1 text-xs bg-blue-brand text-white rounded px-2 py-1 disabled:opacity-40"
          >
            Assign
          </button>
          <button
            onClick={() => setShowAddPosition(false)}
            className="text-xs text-content-secondary hover:underline px-2"
          >
            Cancel
          </button>
        </div>
      </div>
    )}
  </section>
)}
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -40
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/shell/WorkerInspectorPanel.tsx
git commit -m "feat(ui): add project position assignment to WorkerInspectorPanel"
```

---

## Task 7: Final Type-Check and Integration Verification

- [ ] **Step 1: Full type-check**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 2: Verify the data flow end-to-end (manual checklist)**

With the dev server running (`npm run dev`):

1. **Admin view:** Open WorkerInspectorPanel for any worker → "Project Position" section should appear → assign a project position → the row should appear in the list.
2. **Supabase verify:** Check the `worker_project_roles` table in Supabase dashboard — the row should be persisted.
3. **Remove position:** Click × next to a position → it should disappear from the list and from Supabase.
4. **Field leader login (manual test):** In Supabase, link a worker record to a real auth user (`user_id` column on workers). Assign that worker a position on Project A. Log in as that user → only Project A should appear in the project picker → switching to Project A should set role to foreman/superintendent in OrgProvider.

- [ ] **Step 3: Commit any fixes, then final summary commit**

```bash
git add -p  # stage any remaining changes
git commit -m "feat: project-scoped roles for foremen and superintendents"
```
