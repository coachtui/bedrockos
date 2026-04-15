# Entity Creation Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move workers, crews, projects, and assets out of static mock files into OrgProvider in-memory state, and build Create Project, Add Asset, and Create Crew flows.

**Architecture:** OrgProvider becomes the single source of truth for all core entities in Phase 1–2, seeded from existing mock files on init. Pages read from OrgProvider via `useOrg()` instead of importing mock files directly. Modals call OrgProvider mutators which append to state and emit activity events. This mirrors the Phase 3 Supabase swap exactly — only the seed source changes.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide icons, `useOrg()` / OrgProvider pattern

**Spec:** `docs/superpowers/specs/2026-04-14-core-data-ingestion-design.md`

**Note:** This plan covers spec steps 1–5 (foundation + creation modals). CSV import, onboarding wizard, and activity wiring across all modules are Plan B.

**Verification:** No test runner in this repo. Each task verifies with `npx tsc --noEmit` (type safety) and dev server visual check. Run dev server once at the start: `npm run dev`.

---

## File Map

### New files
| File | Purpose |
|------|---------|
| `src/lib/mock/workers.ts` | `MOCK_WORKERS: OrgWorker[]` — org worker roster, replaces `MOCK_CRU_WORKERS` as roster source |
| `src/components/shell/CreateProjectModal.tsx` | Modal: create a new project |
| `src/components/shell/AddAssetModal.tsx` | Modal: add an asset to a project |
| `src/components/shell/CreateCrewModal.tsx` | Modal: create a crew and assign workers (2-step) |
| `src/app/(shell)/projects/client.tsx` | Client wrapper for Projects page (enables modal state) |
| `src/app/(shell)/assets/client.tsx` | Client wrapper for Assets page (enables modal state) |
| `src/app/(shell)/crews/client.tsx` | Client wrapper for Crews page (enables modal state) |

### Modified files
| File | What changes |
|------|-------------|
| `src/types/domain.ts` | Add `OrgCrew` interface |
| `src/lib/registry/workforce.ts` | Add `getOrgWorkforceLocal()` reading from `MOCK_WORKERS` |
| `src/lib/config/org.ts` | Rename `MOCK_PROJECTS` → `MOCK_PROJECT_CONTEXTS` (was `ProjectContext[]`, conflicted with `lib/mock/projects.ts`) |
| `src/providers/OrgProvider.tsx` | Add `workers`, `crews`, `projects` state + 5 mutators; derive `availableProjects` from `projects` |
| `src/app/(shell)/modules/mx/work-orders/CreateWorkOrderModal.tsx` | Update import after rename |
| `src/app/(shell)/projects/page.tsx` | Remove static data, render `ProjectsClient` |
| `src/app/(shell)/assets/page.tsx` | Remove static data, render `AssetsClient` |
| `src/app/(shell)/crews/page.tsx` | Remove static data, render `CrewsClient` |

---

## Task 1 — Rename config MOCK_PROJECTS to avoid collision

The name `MOCK_PROJECTS` exists in both `src/lib/config/org.ts` (type `ProjectContext[]`) and `src/lib/mock/projects.ts` (type `Project[]`). The config version is not a full project list — rename it to clarify.

**Files:**
- Modify: `src/lib/config/org.ts`
- Modify: `src/providers/OrgProvider.tsx`
- Modify: `src/app/(shell)/modules/mx/work-orders/CreateWorkOrderModal.tsx`

- [ ] **Step 1: Rename in config/org.ts**

In `src/lib/config/org.ts`, change:
```ts
// Before
export const MOCK_PROJECTS: ProjectContext[] = [
  { id: "proj_highland_002",  name: "Highland Tower — Phase 2",    slug: "highland-tower-p2" },
  { id: "proj_oakridge_001",  name: "Oakridge Industrial Complex", slug: "oakridge-industrial" },
  { id: "proj_meridian_003",  name: "Meridian Bridge Rehab",       slug: "meridian-bridge" },
  { id: "proj_riverside_006", name: "Riverside District Parking",  slug: "riverside-district" },
  { id: "proj_eastside_007",  name: "Eastside Medical Campus",     slug: "eastside-medical" },
];

export const MOCK_ORG_CONFIG: OrgConfig = {
  ...
  currentProject: MOCK_PROJECTS[0],
```

```ts
// After
export const MOCK_PROJECT_CONTEXTS: ProjectContext[] = [
  { id: "proj_highland_002",  name: "Highland Tower — Phase 2",    slug: "highland-tower-p2" },
  { id: "proj_oakridge_001",  name: "Oakridge Industrial Complex", slug: "oakridge-industrial" },
  { id: "proj_meridian_003",  name: "Meridian Bridge Rehab",       slug: "meridian-bridge" },
  { id: "proj_riverside_006", name: "Riverside District Parking",  slug: "riverside-district" },
  { id: "proj_eastside_007",  name: "Eastside Medical Campus",     slug: "eastside-medical" },
];

export const MOCK_ORG_CONFIG: OrgConfig = {
  ...
  currentProject: MOCK_PROJECT_CONTEXTS[0],
```

- [ ] **Step 2: Update OrgProvider import**

In `src/providers/OrgProvider.tsx`, change:
```ts
// Before
import { getOrgConfig, MOCK_PROJECTS, MOCK_USER_BY_ROLE, DEFAULT_USER } from "@/lib/config/org";
```
```ts
// After
import { getOrgConfig, MOCK_PROJECT_CONTEXTS, MOCK_USER_BY_ROLE, DEFAULT_USER } from "@/lib/config/org";
```

And in the provider value:
```tsx
// Before
availableProjects: MOCK_PROJECTS,
```
```tsx
// After — will be replaced properly in Task 3, for now just fix the name
availableProjects: MOCK_PROJECT_CONTEXTS,
```

- [ ] **Step 3: Update CreateWorkOrderModal import**

In `src/app/(shell)/modules/mx/work-orders/CreateWorkOrderModal.tsx`, change:
```ts
// Before
import { MOCK_PROJECTS } from "@/lib/config/org";
```
```ts
// After
import { MOCK_PROJECT_CONTEXTS } from "@/lib/config/org";
```

And update both uses of `MOCK_PROJECTS` in that file to `MOCK_PROJECT_CONTEXTS`.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors related to `MOCK_PROJECTS`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/config/org.ts src/providers/OrgProvider.tsx src/app/(shell)/modules/mx/work-orders/CreateWorkOrderModal.tsx
git commit -m "refactor: rename MOCK_PROJECTS in config/org to MOCK_PROJECT_CONTEXTS"
```

---

## Task 2 — Create MOCK_WORKERS and update OrgWorkforceRegistry

**Files:**
- Create: `src/lib/mock/workers.ts`
- Modify: `src/lib/registry/workforce.ts`

- [ ] **Step 1: Add `OrgWorker` type to domain.ts**

In `src/types/domain.ts`, add after the `User` interface:
```ts
export interface OrgWorker {
  id:        string;
  orgId:     string;
  name:      string;
  role:      string;   // mechanic | driver | mason | foreman | superintendent | ...
  userId:    string | null;  // null until worker has an AIGACP login
  available: boolean;
  projectId?: string;
  siteName?:  string;
}
```

- [ ] **Step 2: Create src/lib/mock/workers.ts**

```ts
import type { OrgWorker } from "@/types/domain";

export const MOCK_WORKERS: OrgWorker[] = [
  // Mechanics
  { id: "worker_001", orgId: "org_aiga_001", name: "Tony Reeves",    role: "mechanic",       userId: "cru_w_001", available: true,  projectId: "proj_highland_002", siteName: "Highland Tower — Phase 2" },
  { id: "worker_002", orgId: "org_aiga_001", name: "Derek Walsh",    role: "mechanic",       userId: null,        available: true,  projectId: "proj_eastside_007", siteName: "Eastside Medical Campus" },
  { id: "worker_003", orgId: "org_aiga_001", name: "Carlos Mejia",   role: "mechanic",       userId: null,        available: true  },
  { id: "worker_004", orgId: "org_aiga_001", name: "Priya Nair",     role: "mechanic",       userId: null,        available: false },

  // Drivers
  { id: "worker_005", orgId: "org_aiga_001", name: "Marco Ruiz",     role: "driver",         userId: null,        available: true,  projectId: "proj_riverside_006", siteName: "Riverside District Parking" },
  { id: "worker_006", orgId: "org_aiga_001", name: "Jean Lafleur",   role: "driver",         userId: null,        available: true  },
  { id: "worker_007", orgId: "org_aiga_001", name: "Kenji Tanaka",   role: "driver",         userId: null,        available: false },

  // Masons
  { id: "worker_008", orgId: "org_aiga_001", name: "Luis Torres",    role: "mason",          userId: null,        available: true,  projectId: "proj_highland_002", siteName: "Highland Tower — Phase 2" },
  { id: "worker_009", orgId: "org_aiga_001", name: "Ahmed Siddiqui", role: "mason",          userId: null,        available: true  },
  { id: "worker_010", orgId: "org_aiga_001", name: "Bruno Costa",    role: "mason",          userId: null,        available: false },

  // Foremen / Superintendents
  { id: "worker_011", orgId: "org_aiga_001", name: "Marcus Jimenez", role: "foreman",        userId: null,        available: true,  projectId: "proj_highland_002", siteName: "Highland Tower — Phase 2" },
  { id: "worker_012", orgId: "org_aiga_001", name: "Carmen Nguyen",  role: "superintendent", userId: null,        available: true,  projectId: "proj_oakridge_001", siteName: "Oakridge Industrial Complex" },
];
```

- [ ] **Step 3: Add getOrgWorkforceLocal to registry/workforce.ts**

In `src/lib/registry/workforce.ts`, add at the bottom:
```ts
import { MOCK_WORKERS } from "@/lib/mock/workers";

/**
 * Phase 1–2: returns org workforce from MOCK_WORKERS (local, synchronous).
 * Phase 3: replaced by a Supabase fetch.
 */
export function getOrgWorkforceLocal(orgId: string, projectId?: string): OrgWorker[] {
  const all = MOCK_WORKERS.filter((w) => w.orgId === orgId);
  return projectId ? all.filter((w) => !w.projectId || w.projectId === projectId) : all;
}
```

Note: `OrgWorker` is now imported from `@/types/domain` not defined locally in workforce.ts. Remove the local `OrgWorker` interface from `src/lib/registry/workforce.ts` and update the import:
```ts
import type { OrgWorker } from "@/types/domain";
```

Also update the `toOrgWorker` function return type and the exported functions in that file to use the new `OrgWorker` from domain.ts. The `source` field no longer exists on `OrgWorker` — remove it from `toOrgWorker`.

The updated `src/lib/registry/workforce.ts`:
```ts
/**
 * OrgWorkforceRegistry — Phase 1: thin wrapper over the CRU integration adapter.
 * Phase 3: worker records live in AIGACP; CRU syncs from here.
 */

import {
  getCruWorkersForOrg,
  getCruWorkersByRole,
  getCruMechanicsAndDrivers,
  type CruWorker,
} from "@/lib/integrations/cru";
import { MOCK_WORKERS } from "@/lib/mock/workers";
import type { OrgWorker } from "@/types/domain";

function toOrgWorker(orgId: string) {
  return (w: CruWorker): OrgWorker => ({
    id:        w.id,
    name:      w.name,
    role:      w.role,
    orgId,
    userId:    null,
    projectId: w.siteId,
    siteName:  w.siteName,
    available: w.available,
  });
}

export async function getOrgWorkforce(orgId: string, siteId?: string): Promise<OrgWorker[]> {
  const workers = await getCruWorkersForOrg(orgId, siteId);
  return workers.map(toOrgWorker(orgId));
}

export async function getOrgWorkersByRole(orgId: string, role: string): Promise<OrgWorker[]> {
  const workers = await getCruWorkersByRole(orgId, role);
  return workers.map(toOrgWorker(orgId));
}

export async function getOrgMechanicsAndDrivers(orgId: string): Promise<OrgWorker[]> {
  const workers = await getCruMechanicsAndDrivers(orgId);
  return workers.map(toOrgWorker(orgId));
}

/**
 * Phase 1–2: returns org workforce from MOCK_WORKERS (local, synchronous).
 * Phase 3: replaced by a Supabase fetch.
 */
export function getOrgWorkforceLocal(orgId: string, projectId?: string): OrgWorker[] {
  const all = MOCK_WORKERS.filter((w) => w.orgId === orgId);
  return projectId ? all.filter((w) => !w.projectId || w.projectId === projectId) : all;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/domain.ts src/lib/mock/workers.ts src/lib/registry/workforce.ts
git commit -m "feat(registry): add OrgWorker type and MOCK_WORKERS; decouple roster from CRU adapter"
```

---

## Task 3 — Add OrgCrew type and extend OrgProvider with entity state + mutators

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/providers/OrgProvider.tsx`

- [ ] **Step 1: Add OrgCrew interface to domain.ts**

In `src/types/domain.ts`, add after `OrgWorker`:
```ts
export interface OrgCrew {
  id:        string;
  orgId:     string;
  projectId: string;
  name:      string;
  memberIds: string[];   // OrgWorker ids
  // Preserved from seeded data; undefined for user-created crews
  leadName?: string;
  status?:   CrewStatus;
}
```

- [ ] **Step 2: Add CreateProjectInput, CreateAssetInput, CreateCrewInput types to domain.ts**

```ts
export interface CreateProjectInput {
  name:      string;
  location:  string;
  phase:     string;
  pmName:    string;
  startDate: string;  // YYYY-MM-DD
  endDate:   string;  // YYYY-MM-DD
}

export interface CreateAssetInput {
  name:      string;
  type:      string;
  status:    AssetStatus;
  projectId: string;
}

export interface CreateCrewInput {
  name:      string;
  projectId: string;
  memberIds: string[];
}
```

- [ ] **Step 3: Rewrite OrgProvider.tsx**

Replace the full file with:
```tsx
"use client";

import React, { createContext, useContext, useState } from "react";
import type { OrgConfig, ProjectContext, ModuleId, UserRole } from "@/types/org";
import type { ModuleFeatureMap } from "@/types/org";
import type {
  Issue, ActivityEvent, Project, Asset, OrgWorker, OrgCrew,
  CreateProjectInput, CreateAssetInput, CreateCrewInput,
} from "@/types/domain";
import { getOrgConfig, MOCK_PROJECT_CONTEXTS, MOCK_USER_BY_ROLE, DEFAULT_USER } from "@/lib/config/org";
import { getModulesForBundles } from "@/lib/modules/bundles";
import { MOCK_PROJECTS } from "@/lib/mock/projects";
import { MOCK_ASSETS }   from "@/lib/mock/assets";
import { MOCK_WORKERS }  from "@/lib/mock/workers";
import { MOCK_CREWS }    from "@/lib/mock/crews";

interface OrgContextValue {
  currentOrganization: OrgConfig["org"];
  currentProject:      ProjectContext;
  currentUser:         OrgConfig["currentUser"];
  role:                UserRole;
  enabledModules:      ModuleId[];
  features:            OrgConfig["features"];
  availableProjects:   ProjectContext[];
  setCurrentProject:   (project: ProjectContext) => void;
  setRole:             (role: UserRole) => void;
  isModuleEnabled:     (id: ModuleId) => boolean;
  getModuleFeatures:   (id: ModuleId) => ModuleFeatureMap;
  emittedIssues:       Issue[];
  emittedActivity:     ActivityEvent[];
  addEmittedIssue:     (issue: Issue) => void;
  addEmittedActivity:  (event: ActivityEvent) => void;
  // Entity state
  projects:   Project[];
  assets:     Asset[];
  workers:    OrgWorker[];
  crews:      OrgCrew[];
  // Entity mutators
  addProject: (input: CreateProjectInput) => Project;
  addAsset:   (input: CreateAssetInput)   => Asset;
  addCrew:    (input: CreateCrewInput)    => OrgCrew;
}

const OrgContext = createContext<OrgContextValue | null>(null);

function seedCrews(orgId: string): OrgCrew[] {
  return MOCK_CREWS.map((c) => ({
    id:        c.id,
    orgId,
    projectId: c.project_id,
    name:      c.name,
    memberIds: [],
    leadName:  c.lead_name,
    status:    c.status,
  }));
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<OrgConfig>(getOrgConfig);

  // Emitter state
  const [emittedIssues,   setEmittedIssues]   = useState<Issue[]>([]);
  const [emittedActivity, setEmittedActivity] = useState<ActivityEvent[]>([]);

  // Entity state — seeded from mock files
  const orgId = config.org.id;
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [assets,   setAssets]   = useState<Asset[]>(MOCK_ASSETS);
  const [workers]               = useState<OrgWorker[]>(MOCK_WORKERS.filter((w) => w.orgId === orgId));
  const [crews,    setCrews]    = useState<OrgCrew[]>(seedCrews(orgId));

  function addEmittedActivity(event: ActivityEvent): void {
    setEmittedActivity((prev) => [event, ...prev]);
  }

  function addEmittedIssue(issue: Issue): void {
    setEmittedIssues((prev) => [issue, ...prev]);
  }

  function setCurrentProject(project: ProjectContext) {
    setConfig((prev) => ({ ...prev, currentProject: project }));
  }

  function setRole(role: UserRole) {
    setConfig((prev) => ({
      ...prev,
      currentUser: MOCK_USER_BY_ROLE[role] ?? { ...DEFAULT_USER, role },
    }));
  }

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
    };
    setProjects((prev) => [project, ...prev]);
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      "created project",
      entity_type: "project",
      entity_name: project.name,
      project_id:  project.id,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
    return project;
  }

  function addAsset(input: CreateAssetInput): Asset {
    const asset: Asset = {
      id:         crypto.randomUUID(),
      name:       input.name,
      type:       input.type,
      status:     input.status,
      project_id: input.projectId,
      last_seen:  new Date().toISOString(),
    };
    setAssets((prev) => [asset, ...prev]);
    const project = projects.find((p) => p.id === input.projectId);
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      "added asset",
      entity_type: "equipment",
      entity_name: asset.name,
      project_id:  input.projectId,
      module:      "shell",
      timestamp:   new Date().toISOString(),
      target_type: "project",
      target_id:   project?.id,
    });
    return asset;
  }

  function addCrew(input: CreateCrewInput): OrgCrew {
    const leadWorker = workers.find((w) => w.id === input.memberIds[0]);
    const crew: OrgCrew = {
      id:        crypto.randomUUID(),
      orgId,
      projectId: input.projectId,
      name:      input.name,
      memberIds: input.memberIds,
      leadName:  leadWorker?.name,
      status:    "on_site",
    };
    setCrews((prev) => [crew, ...prev]);
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      `created crew with ${input.memberIds.length} worker${input.memberIds.length !== 1 ? "s" : ""}`,
      entity_type: "crew",
      entity_name: crew.name,
      project_id:  input.projectId,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
    return crew;
  }

  const enabledModules = getModulesForBundles(config.purchasedBundles);

  function isModuleEnabled(id: ModuleId): boolean {
    return enabledModules.includes(id);
  }

  function getModuleFeatures(id: ModuleId): ModuleFeatureMap {
    return config.features[id] ?? {};
  }

  const availableProjects: ProjectContext[] = projects.map((p) => ({
    id:   p.id,
    name: p.name,
    slug: p.slug,
  }));

  return (
    <OrgContext.Provider
      value={{
        currentOrganization: config.org,
        currentProject:      config.currentProject,
        currentUser:         config.currentUser,
        role:                config.currentUser.role,
        enabledModules,
        features:            config.features,
        availableProjects,
        setCurrentProject,
        setRole,
        isModuleEnabled,
        getModuleFeatures,
        emittedIssues,
        emittedActivity,
        addEmittedIssue,
        addEmittedActivity,
        projects,
        assets,
        workers,
        crews,
        addProject,
        addAsset,
        addCrew,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors. If `MOCK_CREWS` import conflicts with `OrgCrew` — the `Crew` type in domain.ts still exists and `MOCK_CREWS` uses it. No conflict.

- [ ] **Step 5: Commit**

```bash
git add src/types/domain.ts src/providers/OrgProvider.tsx
git commit -m "feat(provider): add projects/assets/workers/crews state and addProject/addAsset/addCrew mutators to OrgProvider"
```

---

## Task 4 — Create Project modal + Projects page client wrapper

**Files:**
- Create: `src/components/shell/CreateProjectModal.tsx`
- Create: `src/app/(shell)/projects/client.tsx`
- Modify: `src/app/(shell)/projects/page.tsx`

- [ ] **Step 1: Create CreateProjectModal.tsx**

```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import type { CreateProjectInput } from "@/types/domain";

interface Props {
  onClose:   () => void;
  onCreated: (projectId: string) => void;
}

const PHASES = [
  "Pre-Construction", "Foundation", "Structural", "MEP",
  "Finishes", "Closeout", "Planning",
];

export function CreateProjectModal({ onClose, onCreated }: Props) {
  const { currentUser, addProject } = useOrg();

  const [form, setForm] = useState({
    name:      "",
    location:  "",
    phase:     "Pre-Construction",
    pmName:    currentUser.name,
    startDate: "",
    endDate:   "",
  });
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim())     { setError("Project name is required."); return; }
    if (!form.location.trim()) { setError("Location is required."); return; }
    if (!form.startDate)       { setError("Start date is required."); return; }
    if (!form.endDate)         { setError("End date is required."); return; }

    const input: CreateProjectInput = {
      name:      form.name.trim(),
      location:  form.location.trim(),
      phase:     form.phase,
      pmName:    form.pmName.trim() || currentUser.name,
      startDate: form.startDate,
      endDate:   form.endDate,
    };

    const project = addProject(input);
    onCreated(project.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface-base border border-surface-border rounded-[var(--radius-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-content-primary">Create Project</h2>
          <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</p>
          )}

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Project Name</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Highland Tower — Phase 3"
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Location</label>
            <input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Dallas, TX"
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Phase</label>
            <select
              value={form.phase}
              onChange={(e) => set("phase", e.target.value)}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
            >
              {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Project Manager</label>
            <input
              value={form.pmName}
              onChange={(e) => set("pmName", e.target.value)}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-content-secondary hover:text-content-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create src/app/(shell)/projects/client.tsx**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CreateProjectModal } from "@/components/shell/CreateProjectModal";
import { useOrg } from "@/providers/OrgProvider";

export function ProjectsClient() {
  const { projects } = useOrg();
  const [showModal, setShowModal] = useState(false);

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Projects"
        subtitle={`${projects.length} projects across your organization`}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
          >
            <Plus size={13} />
            New Project
          </button>
        }
      />

      <div className="rounded-[var(--radius-card)] border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-overlay">
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Project</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted hidden md:table-cell">Phase</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted hidden lg:table-cell">PM</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Progress</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b border-surface-border last:border-0 hover:bg-surface-overlay transition-colors">
                <td className="px-4 py-3.5">
                  <Link href={`/projects/${project.id}`} className="group block">
                    <p className="font-semibold text-content-primary group-hover:text-gold transition-colors">{project.name}</p>
                    <p className="text-xs text-content-muted mt-0.5">{project.location}</p>
                  </Link>
                </td>
                <td className="px-4 py-3.5 text-content-secondary hidden md:table-cell">{project.phase}</td>
                <td className="px-4 py-3.5 text-content-secondary hidden lg:table-cell">{project.pm_name}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${project.progress_pct}%` }} />
                    </div>
                    <span className="text-xs text-content-muted tabular-nums">{project.progress_pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={project.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreated={() => setShowModal(false)}
        />
      )}
    </PageContainer>
  );
}
```

- [ ] **Step 3: Update src/app/(shell)/projects/page.tsx**

Replace the file with:
```tsx
import { ProjectsClient } from "./client";

export const metadata = { title: "Projects" };

export default function ProjectsPage() {
  return <ProjectsClient />;
}
```

- [ ] **Step 4: Verify TypeScript and check in browser**

```bash
npx tsc --noEmit
```
Expected: no errors.

Open `http://localhost:3000/projects` — projects list shows, "New Project" button visible. Click it — modal opens. Fill form and submit — new project appears at top of list. Open Activity page — new activity event appears.

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/CreateProjectModal.tsx src/app/(shell)/projects/client.tsx src/app/(shell)/projects/page.tsx
git commit -m "feat(shell): add Create Project modal and wire Projects page to OrgProvider"
```

---

## Task 5 — Add Asset modal + Assets page client wrapper

**Files:**
- Create: `src/components/shell/AddAssetModal.tsx`
- Create: `src/app/(shell)/assets/client.tsx`
- Modify: `src/app/(shell)/assets/page.tsx`

- [ ] **Step 1: Create AddAssetModal.tsx**

```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import type { CreateAssetInput, AssetStatus } from "@/types/domain";

interface Props {
  onClose:   () => void;
  onCreated: (assetId: string) => void;
}

const ASSET_TYPES = ["Excavator", "Crane", "Dozer", "Pump", "Lift", "Truck", "Compactor", "Generator", "Other"];
const STATUSES: AssetStatus[] = ["active", "maintenance", "offline"];

export function AddAssetModal({ onClose, onCreated }: Props) {
  const { projects, addAsset, currentProject } = useOrg();

  const [form, setForm] = useState({
    name:      "",
    type:      "Excavator",
    status:    "active" as AssetStatus,
    projectId: currentProject.id,
  });
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Asset name is required."); return; }

    const input: CreateAssetInput = {
      name:      form.name.trim(),
      type:      form.type,
      status:    form.status,
      projectId: form.projectId,
    };

    const asset = addAsset(input);
    onCreated(asset.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface-base border border-surface-border rounded-[var(--radius-card)] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <h2 className="text-sm font-semibold text-content-primary">Add Asset</h2>
          <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</p>
          )}

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Asset Name</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Cat 336 Excavator #EQ-022"
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
            >
              {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as AssetStatus)}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">Project</label>
            <select
              value={form.projectId}
              onChange={(e) => set("projectId", e.target.value)}
              className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
            >
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-content-secondary hover:text-content-primary transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors">
              Add Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create src/app/(shell)/assets/client.tsx**

```tsx
"use client";

import { useState } from "react";
import { Plus, Truck } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AddAssetModal } from "@/components/shell/AddAssetModal";
import { useOrg } from "@/providers/OrgProvider";

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function AssetsClient() {
  const { assets } = useOrg();
  const [showModal, setShowModal] = useState(false);

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Assets"
        subtitle={`${assets.length} tracked assets`}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
          >
            <Plus size={13} />
            Add Asset
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <Card key={asset.id} variant="default">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center">
                <Truck size={16} className="text-content-secondary" />
              </div>
              <StatusBadge status={asset.status} />
            </div>
            <p className="font-semibold text-content-primary text-sm leading-tight">{asset.name}</p>
            <p className="text-xs text-content-muted mt-1">{asset.type}</p>
            <p className="text-xs text-content-muted mt-3 pt-3 border-t border-surface-border">
              Last seen {relativeTime(asset.last_seen)}
            </p>
          </Card>
        ))}
      </div>

      {showModal && (
        <AddAssetModal
          onClose={() => setShowModal(false)}
          onCreated={() => setShowModal(false)}
        />
      )}
    </PageContainer>
  );
}
```

- [ ] **Step 3: Update src/app/(shell)/assets/page.tsx**

Replace with:
```tsx
import { AssetsClient } from "./client";

export const metadata = { title: "Assets" };

export default function AssetsPage() {
  return <AssetsClient />;
}
```

- [ ] **Step 4: Verify TypeScript and check in browser**

```bash
npx tsc --noEmit
```

Open `http://localhost:3000/assets` — asset grid shows, "Add Asset" button visible. Click it — modal opens with project dropdown pre-selected to current project. Submit — new asset appears at top of grid. Check Activity page — activity event logged.

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/AddAssetModal.tsx src/app/(shell)/assets/client.tsx src/app/(shell)/assets/page.tsx
git commit -m "feat(shell): add Add Asset modal and wire Assets page to OrgProvider"
```

---

## Task 6 — Create Crew modal + Crews page client wrapper

This is a 2-step modal: step 1 = crew details, step 2 = worker assignment.

**Files:**
- Create: `src/components/shell/CreateCrewModal.tsx`
- Create: `src/app/(shell)/crews/client.tsx`
- Modify: `src/app/(shell)/crews/page.tsx`

- [ ] **Step 1: Create CreateCrewModal.tsx**

```tsx
"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import type { CreateCrewInput } from "@/types/domain";

interface Props {
  onClose:   () => void;
  onCreated: (crewId: string) => void;
}

type Step = "details" | "workers";

export function CreateCrewModal({ onClose, onCreated }: Props) {
  const { projects, workers, addCrew, currentProject } = useOrg();

  const [step, setStep]         = useState<Step>("details");
  const [name, setName]         = useState("");
  const [projectId, setProjectId] = useState(currentProject.id);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError]       = useState("");

  function toggleWorker(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleDetailsNext(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Crew name is required."); return; }
    setError("");
    setStep("workers");
  }

  function handleSubmit() {
    const input: CreateCrewInput = {
      name:      name.trim(),
      projectId,
      memberIds: Array.from(selectedIds),
    };
    const crew = addCrew(input);
    onCreated(crew.id);
    onClose();
  }

  const projectWorkers = workers.filter(
    (w) => !w.projectId || w.projectId === projectId,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface-base border border-surface-border rounded-[var(--radius-card)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div>
            <h2 className="text-sm font-semibold text-content-primary">Create Crew</h2>
            <p className="text-xs text-content-muted mt-0.5">
              Step {step === "details" ? "1" : "2"} of 2 — {step === "details" ? "Crew details" : "Assign workers"}
            </p>
          </div>
          <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Step 1: Details */}
        {step === "details" && (
          <form onSubmit={handleDetailsNext} className="px-5 py-4 space-y-4">
            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</p>
            )}
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">Crew Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Structural Crew T-5"
                className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
              >
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-content-secondary hover:text-content-primary transition-colors">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors">
                Next: Assign Workers
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Worker assignment */}
        {step === "workers" && (
          <div className="px-5 py-4">
            <p className="text-xs text-content-muted mb-3">
              {selectedIds.size} worker{selectedIds.size !== 1 ? "s" : ""} selected
            </p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {projectWorkers.map((worker) => {
                const selected = selectedIds.has(worker.id);
                return (
                  <button
                    key={worker.id}
                    type="button"
                    onClick={() => toggleWorker(worker.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-left transition-colors ${
                      selected
                        ? "bg-gold/10 border border-gold/30"
                        : "bg-surface-overlay border border-transparent hover:border-surface-border"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-content-primary">{worker.name}</p>
                      <p className="text-xs text-content-muted capitalize">{worker.role}</p>
                    </div>
                    {selected && <Check size={14} className="text-gold shrink-0" />}
                  </button>
                );
              })}
              {projectWorkers.length === 0 && (
                <p className="text-xs text-content-muted text-center py-6">No workers available for this project.</p>
              )}
            </div>
            <div className="flex justify-between gap-2 pt-4 mt-2 border-t border-surface-border">
              <button type="button" onClick={() => setStep("details")} className="px-4 py-2 text-xs text-content-secondary hover:text-content-primary transition-colors">
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
              >
                Create Crew
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create src/app/(shell)/crews/client.tsx**

```tsx
"use client";

import { useState } from "react";
import { Plus, HardHat, Users } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CreateCrewModal } from "@/components/shell/CreateCrewModal";
import { useOrg } from "@/providers/OrgProvider";

export function CrewsClient() {
  const { crews } = useOrg();
  const [showModal, setShowModal] = useState(false);

  const onSite  = crews.filter((c) => c.status === "on_site").length;
  const offSite = crews.filter((c) => c.status === "off_site").length;

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Crews"
        subtitle={`${crews.length} crews · ${onSite} on site · ${offSite} off site`}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
          >
            <Plus size={13} />
            New Crew
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {crews.map((crew) => (
          <Card key={crew.id} variant="default">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center">
                <HardHat size={16} className="text-content-secondary" />
              </div>
              {crew.status && <StatusBadge status={crew.status} />}
            </div>
            <p className="font-semibold text-content-primary text-sm">{crew.name}</p>
            {crew.leadName && (
              <p className="text-xs text-content-muted mt-1">Lead: {crew.leadName}</p>
            )}
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-surface-border">
              <Users size={13} className="text-content-muted" />
              <span className="text-xs text-content-secondary">
                {crew.memberIds.length > 0 ? `${crew.memberIds.length} members` : "No members assigned"}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <CreateCrewModal
          onClose={() => setShowModal(false)}
          onCreated={() => setShowModal(false)}
        />
      )}
    </PageContainer>
  );
}
```

- [ ] **Step 3: Update src/app/(shell)/crews/page.tsx**

Replace with:
```tsx
import { CrewsClient } from "./client";

export const metadata = { title: "Crews" };

export default function CrewsPage() {
  return <CrewsClient />;
}
```

- [ ] **Step 4: Verify TypeScript and check in browser**

```bash
npx tsc --noEmit
```

Open `http://localhost:3000/crews` — crews grid shows (seeded + on-site counts in subtitle). Click "New Crew" — step 1 modal shows crew name + project fields. Click "Next: Assign Workers" — step 2 shows worker list for that project. Select workers — checkmarks appear. Click "Create Crew" — new crew card appears in grid, member count shown. Check Activity page — activity event logged.

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/CreateCrewModal.tsx src/app/(shell)/crews/client.tsx src/app/(shell)/crews/page.tsx
git commit -m "feat(shell): add Create Crew modal (2-step) and wire Crews page to OrgProvider"
```

---

## Done — Plan B

The remaining spec items (CSV import, onboarding wizard, activity wiring across all modules) are covered in **Plan B**: `docs/superpowers/plans/2026-04-14-csv-import-onboarding-activity.md`.

Create Plan B when these tasks are complete.
