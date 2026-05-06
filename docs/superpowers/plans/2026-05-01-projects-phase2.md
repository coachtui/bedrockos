# Projects Phase 2 — Context Sync, Live Data, CX Card, Role-Gated List

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the project detail page a fully live, context-aware surface: it syncs the shell's current project on navigation, shows live issues/alerts/activity from OrgProvider state, displays a CX crew summary card, and limits the project list to role-appropriate projects for field users.

**Architecture:** `OrgProvider` gains `issues`, `alerts`, `activity` state arrays seeded from mock data, replacing the separate `emittedIssues`/`emittedActivity` pattern so module-emitted events flow into the same arrays. The project detail server component (`page.tsx`) stops gating on `MOCK_PROJECTS` (which would 404 on newly created projects). The client component adds a context-sync `useEffect`. A new `ProjectCXCard` component reads from `CxProvider` and `OrgProvider` to show crew/task/event counts. The project list filters to `currentProject` only for field roles.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, React useState/useEffect, Tailwind CSS

---

## File Structure

**Modify:**
- `src/providers/OrgProvider.tsx` — add `issues`, `alerts`, `activity` state; replace emitted pattern; expose on context
- `src/components/shell/AssetInspectorPanel.tsx` — consume `issues` from `useOrg()` instead of `[...MOCK_ISSUES, ...emittedIssues]`
- `src/components/shell/WorkerInspectorPanel.tsx` — consume `activity` from `useOrg()` instead of `[...MOCK_ACTIVITY, ...emittedActivity]`
- `src/app/(shell)/projects/[projectId]/page.tsx` — remove MOCK_PROJECTS gate; let client handle not-found
- `src/app/(shell)/projects/[projectId]/client.tsx` — context sync `useEffect`; read live issues/alerts/activity; add `ProjectCXCard`
- `src/app/(shell)/projects/client.tsx` — role-gate project list for field roles

**Create:**
- `src/components/shell/ProjectCXCard.tsx` — CX summary card (workers on site, tasks today, next event)

---

## Existing Patterns to Follow

- `useState` for entity arrays seeded from mock files — see `projects`, `workers`, `crews` in `OrgProvider.tsx`
- `useEffect` for context sync — see `useEffect(() => setForm(toForm(project)), [project.id])` in `ProjectInspectorPanel.tsx`
- `Card` variant="default" with `!p-0` for slotted card layouts — see `IssuesSection`, `AlertsSection` in `client.tsx`
- `useCx()` from `@/providers/CxProvider` — exposes `tasks`, `events`, `assignments`
- `getRoleGroup(role)` from `@/lib/utils/roles` — `"field"` covers superintendent and foreman

---

### Task 1: OrgProvider — unify issues, alerts, activity into state

**Files:**
- Modify: `src/providers/OrgProvider.tsx`
- Modify: `src/components/shell/AssetInspectorPanel.tsx`
- Modify: `src/components/shell/WorkerInspectorPanel.tsx`

- [ ] **Step 1: Add `Alert` to domain imports and add mock file imports in `OrgProvider.tsx`**

Find the existing domain import block (starts with `import type { Issue, ActivityEvent, Project...`). Add `Alert` to it:

```ts
import type {
  Issue, ActivityEvent, Alert, Project, Asset, OrgWorker, OrgCrew,
  AssetStatus, CrewStatus,
  CreateProjectInput, CreateAssetInput, CreateCrewInput,
  CreateWorkerInput, WorkerRole,
  UpdateProjectInput,
} from "@/types/domain";
```

Add three new mock imports after the existing `MOCK_WORKERS` import line:

```ts
import { MOCK_ISSUES }   from "@/lib/mock/issues";
import { MOCK_ALERTS }   from "@/lib/mock/alerts";
import { MOCK_ACTIVITY } from "@/lib/mock/activity";
```

- [ ] **Step 2: Update the context value interface in `OrgProvider.tsx`**

Find the `interface OrgContextValue` block. Replace the four emitted lines:

```ts
// DELETE these four lines:
emittedIssues:       Issue[];
emittedActivity:     ActivityEvent[];
addEmittedIssue:     (issue: Issue) => void;
addEmittedActivity:  (event: ActivityEvent) => void;
```

With:

```ts
issues:   Issue[];
alerts:   Alert[];
activity: ActivityEvent[];
addEmittedIssue:    (issue: Issue) => void;
addEmittedActivity: (event: ActivityEvent) => void;
```

(Keep `addEmittedIssue` and `addEmittedActivity` on the interface — callers like `useShellEmitter.ts` and MX use them. Only the backing state changes.)

- [ ] **Step 3: Replace emitted state with full entity state in `OrgProvider.tsx`**

Find the emitter state block:

```ts
// Emitter state
const [emittedIssues,   setEmittedIssues]   = useState<Issue[]>([]);
const [emittedActivity, setEmittedActivity] = useState<ActivityEvent[]>([]);
```

Replace with:

```ts
// Issues / alerts / activity — seeded from mock; module events prepend via addEmitted*
const [issues,   setIssues]   = useState<Issue[]>(MOCK_ISSUES);
const [alerts,   setAlerts]   = useState<Alert[]>(MOCK_ALERTS);
const [activity, setActivity] = useState<ActivityEvent[]>(MOCK_ACTIVITY);
```

- [ ] **Step 4: Update `addEmittedIssue` and `addEmittedActivity` to write to the new arrays**

Find `addEmittedActivity` and `addEmittedIssue`. Replace both:

```ts
function addEmittedActivity(event: ActivityEvent): void {
  setActivity((prev) => [event, ...prev]);
}

function addEmittedIssue(issue: Issue): void {
  setIssues((prev) => [issue, ...prev]);
}
```

- [ ] **Step 5: Update the context Provider value object**

Find the `<OrgContext.Provider value={{...}}>` block. Replace:

```ts
emittedIssues,
emittedActivity,
addEmittedIssue,
addEmittedActivity,
```

With:

```ts
issues,
alerts,
activity,
addEmittedIssue,
addEmittedActivity,
```

- [ ] **Step 6: Fix `AssetInspectorPanel.tsx` to use `issues` from context**

In `src/components/shell/AssetInspectorPanel.tsx`:

Remove the `MOCK_ISSUES` import:
```ts
// DELETE:
import { MOCK_ISSUES } from "@/lib/mock/issues";
```

Update the `useOrg()` destructure (find `assets, projects, role, emittedIssues,`):
```ts
const {
  assets, projects, role, issues,
  updateAssetStatus, updateAssetProject,
} = useOrg();
```

Update the `linkedIssues` derived value:
```ts
const linkedIssues = asset
  ? issues.filter((i) => i.asset_id === asset.id)
  : [];
```

- [ ] **Step 7: Fix `WorkerInspectorPanel.tsx` to use `activity` from context**

In `src/components/shell/WorkerInspectorPanel.tsx`:

Remove the `MOCK_ACTIVITY` import:
```ts
// DELETE:
import { MOCK_ACTIVITY } from "@/lib/mock/activity";
```

Update the `useOrg()` destructure (find the line with `emittedActivity`):
```ts
const {
  currentProject, role, activity,
  workers, crews, projects,
  updateWorkerSkills, reassignWorker, toggleWorkerAvailability,
  addWorkerToCrew, removeWorkerFromCrew,
} = useOrg();
```

Update the `workerActivity` derived value:
```ts
const workerActivity = worker
  ? activity
      .filter((e) => e.entity_type === "worker" && e.entity_id === worker.id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  : [];
```

- [ ] **Step 8: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: exit 0, no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add src/providers/OrgProvider.tsx src/components/shell/AssetInspectorPanel.tsx src/components/shell/WorkerInspectorPanel.tsx
git commit -m "feat(projects): unify issues/alerts/activity into OrgProvider state"
```

---

### Task 2: Fix page.tsx, context sync, and live data in client.tsx

**Files:**
- Modify: `src/app/(shell)/projects/[projectId]/page.tsx`
- Modify: `src/app/(shell)/projects/[projectId]/client.tsx`

- [ ] **Step 1: Simplify `page.tsx` to remove MOCK_PROJECTS dependency**

The current `page.tsx` imports `MOCK_PROJECTS` and calls `notFound()` if the project isn't in the static list — this 404s for any project created at runtime. Replace the entire file:

```tsx
import { ProjectCommandCenterClient } from "./client";

type Params = Promise<{ projectId: string }>;

export const metadata = { title: "Project — Command Center" };

export default async function ProjectCommandCenterPage({ params }: { params: Params }) {
  const { projectId } = await params;
  return <ProjectCommandCenterClient projectId={projectId} />;
}
```

- [ ] **Step 2: Add `useEffect` import to `client.tsx`**

The file currently imports `useState` from React. Add `useEffect`:

```ts
import React, { useState, useEffect } from "react";
```

- [ ] **Step 3: Add `setCurrentProject`, `issues`, `alerts`, `activity` to the `useOrg()` destructure in `ProjectCommandCenterClient`**

Find (around line 344):
```ts
const { role, projects } = useOrg();
```

Replace with:
```ts
const { role, projects, setCurrentProject, issues, alerts, activity } = useOrg();
```

- [ ] **Step 4: Add context-sync `useEffect` before the not-found guard**

In `ProjectCommandCenterClient`, the current structure is:
```ts
const project = projects.find((p) => p.id === projectId);
if (!project) { return (...) }
```

Insert the `useEffect` between them (hooks must appear before early returns):

```ts
const project = projects.find((p) => p.id === projectId);

useEffect(() => {
  if (project) {
    setCurrentProject({ id: project.id, name: project.name, slug: project.slug });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [project?.id]);

if (!project) {
  return (
    <PageContainer>
      <p className="text-content-muted py-12 text-center text-sm">Project not found.</p>
    </PageContainer>
  );
}
```

- [ ] **Step 5: Replace mock imports with live state in `client.tsx`**

Remove the three mock imports:
```ts
// DELETE these three lines:
import { MOCK_ISSUES }   from "@/lib/mock/issues";
import { MOCK_ALERTS }   from "@/lib/mock/alerts";
import { MOCK_ACTIVITY } from "@/lib/mock/activity";
```

Find the three project-scoped filter lines (around line 360):
```ts
const projectIssues   = MOCK_ISSUES.filter((i) => i.project_id === projectId);
const projectAlerts   = MOCK_ALERTS.filter((a) => a.project_id === projectId);
const projectActivity = MOCK_ACTIVITY.filter((e) => e.project_id === projectId).slice(0, 8);
```

Replace with:
```ts
const projectIssues   = issues.filter((i) => i.project_id === projectId);
const projectAlerts   = alerts.filter((a) => a.project_id === projectId);
const projectActivity = activity.filter((e) => e.project_id === projectId).slice(0, 8);
```

- [ ] **Step 6: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(shell)/projects/[projectId]/page.tsx" "src/app/(shell)/projects/[projectId]/client.tsx"
git commit -m "feat(projects): context sync on navigation, live issues/alerts/activity"
```

---

### Task 3: Create ProjectCXCard

**Files:**
- Create: `src/components/shell/ProjectCXCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import Link from "next/link";
import { Users, CalendarDays, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";

interface ProjectCXCardProps {
  projectId: string;
}

export function ProjectCXCard({ projectId }: ProjectCXCardProps) {
  const { workers } = useOrg();
  const { tasks, events } = useCx();

  const today = new Date().toISOString().split("T")[0];

  const onSiteCount = workers.filter((w) => w.projectId === projectId).length;

  const activeTasks = tasks.filter(
    (t) => t.projectId === projectId && t.startDate <= today && t.endDate >= today,
  );

  const nextEvent = events
    .filter((e) => e.projectId === projectId && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return (
    <Card variant="default" className="!p-0">
      <div className="p-5 pb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted">CX — Crew Operations</p>
        <Link
          href="/modules/cru"
          className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1"
        >
          Open <ChevronRight size={11} />
        </Link>
      </div>

      <div className="px-5 pb-5 space-y-3">
        <div className="flex items-center gap-3">
          <Users size={13} className="text-gold shrink-0" />
          <span className="text-sm text-content-primary">
            <span className="font-semibold">{onSiteCount}</span>{" "}
            <span className="text-content-muted">
              worker{onSiteCount !== 1 ? "s" : ""} assigned
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <CalendarDays size={13} className="text-gold shrink-0" />
          <span className="text-sm text-content-primary">
            <span className="font-semibold">{activeTasks.length}</span>{" "}
            <span className="text-content-muted">
              task{activeTasks.length !== 1 ? "s" : ""} active today
            </span>
          </span>
        </div>

        {nextEvent && (
          <div className="mt-3 pt-3 border-t border-surface-border">
            <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted mb-1.5">
              Next Event
            </p>
            <p className="text-sm font-medium text-content-primary">{nextEvent.name}</p>
            <p className="text-xs text-content-muted mt-0.5">
              {new Date(nextEvent.date + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day:   "numeric",
              })}
              {nextEvent.location && ` · ${nextEvent.location}`}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: exit 0. `ProjectCXCard` isn't imported anywhere yet — no routing errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/ProjectCXCard.tsx
git commit -m "feat(projects): add ProjectCXCard showing crew count, tasks today, next event"
```

---

### Task 4: Wire ProjectCXCard + role-gate project list

**Files:**
- Modify: `src/app/(shell)/projects/[projectId]/client.tsx`
- Modify: `src/app/(shell)/projects/client.tsx`

- [ ] **Step 1: Import `ProjectCXCard` in `client.tsx`**

Add after the existing shell component imports:
```ts
import { ProjectCXCard } from "@/components/shell/ProjectCXCard";
```

- [ ] **Step 2: Add `ProjectCXCard` to the right column**

In the right column (`<div className="lg:col-span-2 space-y-4">`), add `ProjectCXCard` as the first card — before the "Project Snapshot" card:

```tsx
{/* CX Summary */}
<ProjectCXCard projectId={projectId} />

{/* Project Snapshot — de-emphasize for field/maintenance */}
<Card ...>
```

- [ ] **Step 3: Role-gate the project list in `src/app/(shell)/projects/client.tsx`**

The file currently imports `useOrg`. Add `getRoleGroup` import:
```ts
import { getRoleGroup } from "@/lib/utils/roles";
```

Update the `useOrg()` destructure:
```ts
const { projects, role, currentProject } = useOrg();
```

Add `roleGroup` and `visibleProjects` derivations (after the `useOrg()` destructure):
```ts
const roleGroup       = getRoleGroup(role);
const visibleProjects = roleGroup === "field"
  ? projects.filter((p) => p.id === currentProject.id)
  : projects;
```

Update the `SectionHeader` subtitle and hide the New Project button for field roles:
```tsx
<SectionHeader
  title="Projects"
  subtitle={
    roleGroup === "field"
      ? "Your assigned project"
      : `${projects.length} projects across your organization`
  }
  action={
    roleGroup !== "field" ? (
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
      >
        <Plus size={13} />
        New Project
      </button>
    ) : undefined
  }
/>
```

Update the `projects.map(...)` table row to use `visibleProjects`:
```tsx
{visibleProjects.map((project) => (
  <tr key={project.id} ...>
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(shell)/projects/[projectId]/client.tsx" "src/app/(shell)/projects/client.tsx"
git commit -m "feat(projects): CX card on project detail, role-gated project list"
```

---

## Self-Review

**Spec coverage:**
- ✅ Context sync: `useEffect` in `client.tsx` calls `setCurrentProject` on project navigation
- ✅ Live issues/alerts/activity: OrgProvider state arrays replace mock imports in project detail
- ✅ Module-emitted events flow into unified arrays (`addEmittedIssue` → `setIssues`, `addEmittedActivity` → `setActivity`)
- ✅ `AssetInspectorPanel` and `WorkerInspectorPanel` updated to use unified state
- ✅ `page.tsx` no longer 404s on runtime-created projects
- ✅ `ProjectCXCard`: worker count, tasks active today, next event
- ✅ Role-gated project list: field roles see only `currentProject`; New Project button hidden
- ✅ Subtitle updates to reflect role-scoped view

**Placeholder scan:** No TBDs, no "add appropriate X", no "similar to" references. All code blocks are complete.

**Type consistency:**
- `issues: Issue[]`, `alerts: Alert[]`, `activity: ActivityEvent[]` — types match domain imports
- `ProjectCXCard` receives `projectId: string` — matches usage in client.tsx
- `visibleProjects` filtered from `projects: Project[]` — same type, compatible with `.map()`
- `setCurrentProject` accepts `ProjectContext = { id, name, slug }` — `project.slug` exists on `Project` type (confirmed in domain.ts)
