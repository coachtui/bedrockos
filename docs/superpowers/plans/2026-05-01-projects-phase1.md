# Projects Phase 1 — Enrichment & Live Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add description and award price to projects, enable editing via an inspector panel, and make the project detail page read live state from OrgProvider instead of stale mock data.

**Architecture:** `Project` gets two new optional fields (`description`, `award_price`). OrgProvider gains an `updateProject` mutation. `CreateProjectModal` exposes the new fields. A new `ProjectInspectorPanel` handles editing. The project detail client swaps its `MOCK_PROJECTS.find()` call for `useOrg().projects.find()` so edits are immediately visible. Issues/alerts/activity remain on mock data — that's Phase 2.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, React useState/useEffect

---

## File Structure

**Modify:**
- `src/types/domain.ts` — add `description?: string`, `award_price?: number` to `Project` and `CreateProjectInput`; add `UpdateProjectInput` type
- `src/lib/mock/projects.ts` — add description + award_price to select mock projects
- `src/providers/OrgProvider.tsx` — update `addProject` to pass new fields; add `updateProject` mutation
- `src/components/shell/CreateProjectModal.tsx` — add description + award_price form fields
- `src/app/(shell)/projects/[projectId]/client.tsx` — read project from `useOrg()` (not mock); show description/award_price; add Edit button + panel

**Create:**
- `src/components/shell/ProjectInspectorPanel.tsx` — edit panel for all project fields

---

## Existing Patterns to Follow

- `InspectorPanel` from `@/components/ui/InspectorPanel` — slide-over base used by `TaskInspectorPanel`, `CrewPanel`, `WorkerInspectorPanel`
- `useOrg()` from `@/providers/OrgProvider` — the single source of truth for all shell entity state
- `getRoleGroup(role)` from `@/lib/utils/roles` — returns `"oversight" | "office" | "field" | "maintenance"`

---

### Task 1: Extend Project type, mock data, and OrgProvider

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/lib/mock/projects.ts`
- Modify: `src/providers/OrgProvider.tsx`

- [ ] **Step 1: Add new fields to `Project`, `CreateProjectInput`, and new `UpdateProjectInput` in `src/types/domain.ts`**

Find the `Project` interface and add two lines after `end_date`:
```ts
export interface Project {
  id:            string;
  name:          string;
  slug:          string;
  status:        ProjectStatus;
  phase:         string;
  location:      string;
  pm_name:       string;
  progress_pct:  number;
  open_issues:   number;
  last_activity: string;
  start_date:    string;
  end_date:      string;
  description?:  string;
  award_price?:  number;
}
```

Find `CreateProjectInput` and add the two optional fields:
```ts
export interface CreateProjectInput {
  name:         string;
  location:     string;
  phase:        string;
  pmName:       string;
  startDate:    string;
  endDate:      string;
  description?: string;
  awardPrice?:  number;
}
```

Add a new `UpdateProjectInput` type immediately after `CreateProjectInput`:
```ts
export type UpdateProjectInput = Partial<Pick<Project,
  "name" | "location" | "phase" | "pm_name" | "status" |
  "start_date" | "end_date" | "description" | "award_price"
>>;
```

- [ ] **Step 2: Add description + award_price to two mock projects in `src/lib/mock/projects.ts`**

Add to `proj_highland_002` (after `end_date`):
```ts
description:  "Structural phase construction of a 24-story mixed-use tower. Includes concrete core, steel framing, and MEP rough-in.",
award_price:  48_500_000,
```

Add to `proj_oakridge_001` (after `end_date`):
```ts
description:  "Industrial complex with three warehouse buildings and a 40,000 sq ft administrative facility.",
award_price:  22_750_000,
```

Leave the other three projects without these fields to verify optional rendering.

- [ ] **Step 3: Add `updateProject` to OrgProvider**

In `src/providers/OrgProvider.tsx`, add `UpdateProjectInput` to the domain import at the top:
```ts
import type {
  // ... existing imports
  UpdateProjectInput,
} from "@/types/domain";
```

Add `updateProject` to the context value interface (find the block starting with `addProject:`):
```ts
updateProject: (id: string, patch: UpdateProjectInput) => void;
```

Add the function implementation inside `OrgProvider` (after the `addProject` function body):
```ts
function updateProject(id: string, patch: UpdateProjectInput): void {
  setProjects((prev) =>
    prev.map((p) => {
      if (p.id !== id) return p;
      const updated = { ...p, ...patch };
      if (patch.name) updated.slug = slugify(patch.name);
      return updated;
    }),
  );
}
```

Add `updateProject` to the context Provider value (find where `addProject` is listed and add below it):
```ts
updateProject,
```

- [ ] **Step 4: Update `addProject` in OrgProvider to pass new fields**

Find `addProject` and update the project construction to include the new fields:
```ts
function addProject(input: CreateProjectInput): Project {
  const project: Project = {
    id:            crypto.randomUUID(),
    name:          input.name,
    slug:          slugify(input.name),
    status:        "planning",
    phase:         input.phase,
    location:      input.location,
    pm_name:       input.pmName,
    progress_pct:  0,
    open_issues:   0,
    last_activity: new Date().toISOString(),
    start_date:    input.startDate,
    end_date:      input.endDate,
    description:   input.description,
    award_price:   input.awardPrice,
  };
  // ... rest of function unchanged
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: exit 0, no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/types/domain.ts src/lib/mock/projects.ts src/providers/OrgProvider.tsx
git commit -m "feat(projects): add description and award_price fields, updateProject mutation"
```

---

### Task 2: Update CreateProjectModal with new fields

**Files:**
- Modify: `src/components/shell/CreateProjectModal.tsx`

- [ ] **Step 1: Add new fields to form state and handler**

In `CreateProjectModal`, the `form` state object currently has 6 keys. Add two more:
```ts
const [form, setForm] = useState({
  name:        "",
  location:    "",
  phase:       "Pre-Construction",
  pmName:      currentUser.name,
  startDate:   "",
  endDate:     "",
  description: "",
  awardPrice:  "",
});
```

Update `handleSubmit` to pass the new fields:
```ts
const input: CreateProjectInput = {
  name:        form.name.trim(),
  location:    form.location.trim(),
  phase:       form.phase,
  pmName:      form.pmName.trim() || currentUser.name,
  startDate:   form.startDate,
  endDate:     form.endDate,
  description: form.description.trim() || undefined,
  awardPrice:  form.awardPrice ? Number(form.awardPrice) : undefined,
};
```

- [ ] **Step 2: Add description and award_price fields to the form JSX**

After the end date grid `</div>`, add:
```tsx
<div>
  <label className="block text-xs font-medium text-content-secondary mb-1">
    Description{" "}
    <span className="text-content-muted font-normal">(optional)</span>
  </label>
  <textarea
    value={form.description}
    onChange={(e) => set("description", e.target.value)}
    placeholder="Brief description of project scope and objectives..."
    rows={3}
    className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold resize-none"
  />
</div>

<div>
  <label className="block text-xs font-medium text-content-secondary mb-1">
    Award Price{" "}
    <span className="text-content-muted font-normal">(optional)</span>
  </label>
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
    <input
      type="number"
      value={form.awardPrice}
      onChange={(e) => set("awardPrice", e.target.value)}
      placeholder="0"
      className="w-full text-sm bg-surface-overlay border border-surface-border rounded pl-7 pr-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
    />
  </div>
</div>
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/shell/CreateProjectModal.tsx
git commit -m "feat(projects): add description and award price to create modal"
```

---

### Task 3: ProjectInspectorPanel (edit panel)

**Files:**
- Create: `src/components/shell/ProjectInspectorPanel.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState, useEffect } from "react";
import { InspectorPanel } from "@/components/ui/InspectorPanel";
import { useOrg } from "@/providers/OrgProvider";
import type { Project, ProjectStatus, UpdateProjectInput } from "@/types/domain";

const PHASES = [
  "Pre-Construction", "Foundation", "Structural", "MEP",
  "Finishes", "Closeout", "Planning",
];

const STATUSES: ProjectStatus[] = ["planning", "active", "on_hold", "completed"];

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning:  "Planning",
  active:    "Active",
  on_hold:   "On Hold",
  completed: "Completed",
};

interface FormState {
  name:        string;
  description: string;
  location:    string;
  phase:       string;
  pmName:      string;
  status:      ProjectStatus;
  startDate:   string;
  endDate:     string;
  awardPrice:  string;
}

function toForm(p: Project): FormState {
  return {
    name:        p.name,
    description: p.description ?? "",
    location:    p.location,
    phase:       p.phase,
    pmName:      p.pm_name,
    status:      p.status,
    startDate:   p.start_date,
    endDate:     p.end_date,
    awardPrice:  p.award_price != null ? String(p.award_price) : "",
  };
}

interface ProjectInspectorPanelProps {
  open:    boolean;
  onClose: () => void;
  project: Project;
}

export function ProjectInspectorPanel({ open, onClose, project }: ProjectInspectorPanelProps) {
  const { updateProject } = useOrg();
  const [form, setForm] = useState<FormState>(() => toForm(project));

  useEffect(() => {
    setForm(toForm(project));
  }, [project.id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    const patch: UpdateProjectInput = {
      name:        form.name.trim() || project.name,
      description: form.description.trim() || undefined,
      location:    form.location.trim() || project.location,
      phase:       form.phase,
      pm_name:     form.pmName.trim() || project.pm_name,
      status:      form.status,
      start_date:  form.startDate,
      end_date:    form.endDate,
      award_price: form.awardPrice ? Number(form.awardPrice) : undefined,
    };
    updateProject(project.id, patch);
    onClose();
  }

  const inputCls = "w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold/50";
  const labelCls = "block text-xs font-medium text-content-secondary mb-1";

  return (
    <InspectorPanel
      open={open}
      onClose={onClose}
      title="Edit Project"
      subtitle={project.name}
    >
      <div className="p-4 space-y-4">
        <div>
          <label className={labelCls}>Project Name</label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>
            Description{" "}
            <span className="text-content-muted font-normal">(optional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="Project scope and objectives..."
            className={`${inputCls} resize-none`}
          />
        </div>

        <div>
          <label className={labelCls}>Location</label>
          <input
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Phase</label>
            <select
              value={form.phase}
              onChange={(e) => set("phase", e.target.value)}
              className={inputCls}
            >
              {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as ProjectStatus)}
              className={inputCls}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Project Manager</label>
          <input
            value={form.pmName}
            onChange={(e) => set("pmName", e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>End Date</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>
            Award Price{" "}
            <span className="text-content-muted font-normal">(optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm">$</span>
            <input
              type="number"
              value={form.awardPrice}
              onChange={(e) => set("awardPrice", e.target.value)}
              placeholder="0"
              className={`${inputCls} pl-7`}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-content-secondary hover:text-content-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim()}
            className="px-4 py-2 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </InspectorPanel>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: exit 0. `ProjectInspectorPanel` is not imported anywhere yet — no new routes, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/ProjectInspectorPanel.tsx
git commit -m "feat(projects): add ProjectInspectorPanel for editing project details"
```

---

### Task 4: Project detail — live data, new fields, edit button

**Files:**
- Modify: `src/app/(shell)/projects/[projectId]/client.tsx`

This task does three things in one file:
1. Read the project from `useOrg().projects` instead of `MOCK_PROJECTS`
2. Display `description` and `award_price` in the project header
3. Add an Edit button that opens `ProjectInspectorPanel` (oversight/office roles only)

- [ ] **Step 1: Update imports**

At the top of the file, make these changes:

**Remove** the `MOCK_PROJECTS` import (it's no longer needed for the project lookup):
```ts
// DELETE this line:
import { MOCK_PROJECTS } from "@/lib/mock/projects";
```

**Add** the `ProjectInspectorPanel` and `DollarSign` and `Pencil` imports:
```ts
import { ProjectInspectorPanel } from "@/components/shell/ProjectInspectorPanel";
```

In the lucide-react import line, add `DollarSign` and `Pencil` to the existing list:
```ts
import {
  ArrowLeft, ArrowRight, MapPin, User, Calendar,
  Wrench, Users, ClipboardCheck, ChevronRight,
  AlertCircle, Bell, Truck, DollarSign, Pencil,
} from "lucide-react";
```

- [ ] **Step 2: Replace mock project lookup with live OrgProvider data**

In `ProjectCommandCenterClient`, the existing destructure is:
```ts
const { role } = useOrg();
```

Replace it with:
```ts
const { role, projects } = useOrg();
```

Then replace the existing project lookup line:
```ts
// DELETE:
const project = MOCK_PROJECTS.find((p) => p.id === projectId)!;
```

With:
```ts
const project = projects.find((p) => p.id === projectId);
if (!project) {
  return (
    <PageContainer>
      <p className="text-content-muted py-12 text-center text-sm">Project not found.</p>
    </PageContainer>
  );
}
```

- [ ] **Step 3: Add edit state and canEdit logic**

After the `roleGroup` line, add:
```ts
const [editOpen, setEditOpen] = useState(false);
const canEdit = roleGroup === "oversight" || roleGroup === "office";
```

- [ ] **Step 4: Add formatCurrency helper**

Add this helper function near the top of the file (alongside the existing `formatDate` and `relativeTime` helpers):
```ts
function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}
```

- [ ] **Step 5: Update the project header to show description, award_price, and Edit button**

In the project header card, find the `<div className="flex-1 min-w-0">` section. After the `<h1>` element showing `{project.name}`, add the description:
```tsx
{project.description && (
  <p className="text-sm text-content-secondary mt-1 mb-3 leading-relaxed max-w-xl">
    {project.description}
  </p>
)}
```

In the metadata row (`<div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-content-muted">`), add award_price after the existing date span:
```tsx
{project.award_price != null && (
  <span className="flex items-center gap-1.5">
    <DollarSign size={11} />
    Contract:{" "}
    <span className="text-content-secondary font-medium ml-0.5">
      {formatCurrency(project.award_price)}
    </span>
  </span>
)}
```

In the right column (`<div className="shrink-0 md:text-right">`), add the Edit button above the "Progress" label:
```tsx
{canEdit && (
  <button
    onClick={() => setEditOpen(true)}
    className="mb-4 inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary border border-surface-border hover:border-surface-border-hover rounded-lg px-3 py-1.5 transition-colors"
  >
    <Pencil size={11} />
    Edit
  </button>
)}
```

- [ ] **Step 6: Add ProjectInspectorPanel at the bottom of the JSX return**

Just before the closing `</PageContainer>`, add:
```tsx
{canEdit && (
  <ProjectInspectorPanel
    key={project.id}
    open={editOpen}
    onClose={() => setEditOpen(false)}
    project={project}
  />
)}
```

- [ ] **Step 7: Verify build passes and route appears**

```bash
npm run build 2>&1 | grep -E "projects/\[|error" | head -5
```

Expected: `ƒ /projects/[projectId]` (dynamic route), no errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(shell\)/projects/\[projectId\]/client.tsx
git commit -m "feat(projects): live project data, description/award price display, edit panel"
```

---

## Self-Review

**Spec coverage:**
- ✅ `description?: string` added to Project type and CreateProjectInput
- ✅ `award_price?: number` added to Project type and CreateProjectInput
- ✅ `UpdateProjectInput` type for OrgProvider mutation
- ✅ `updateProject` mutation in OrgProvider (updates + re-slugifies on name change)
- ✅ CreateProjectModal shows description + award_price as optional fields
- ✅ ProjectInspectorPanel handles all editable project fields
- ✅ Project detail reads live data from `useOrg().projects` (not MOCK_PROJECTS)
- ✅ Description shown in project header (when present)
- ✅ Award price shown as formatted currency in metadata row (when present)
- ✅ Edit button opens panel for oversight/office roles only

**No placeholders:** All code is complete.

**Type consistency:**
- `UpdateProjectInput = Partial<Pick<Project, ...>>` uses snake_case to match `Project` fields (`pm_name`, `start_date`, `end_date`, `award_price`)
- `FormState` uses camelCase internally; `handleSave` maps to snake_case for the patch
- `toForm(p: Project): FormState` bridges between the two consistently
