# Workers Page + Skills System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/workers` page with an Add Worker form and a role-grouped, extensible skill catalog managed through OrgProvider.

**Architecture:** Follow the established pattern — OrgProvider holds the skill catalog in-memory (seeded from a new `SKILL_CATALOG` mock), exposes `addWorker` and `addSkillToRole` mutators, and the page/modal components consume them via `useOrg()`. The modal is 2-step: worker details → skill multi-select with optional inline skill addition (superintendent+ only).

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide icons, `useOrg()` / OrgProvider pattern

**Spec:** `docs/superpowers/specs/2026-04-14-workers-skills-design.md`

**Verification:** No test runner. Each task verifies with `npx tsc --noEmit`.

---

## File Map

### New files
| File | Purpose |
|------|---------|
| `src/lib/mock/skills.ts` | `SKILL_CATALOG: Record<WorkerRole, string[]>` — predefined skill pools per role |
| `src/components/shell/AddWorkerModal.tsx` | 2-step modal: worker details → skill multi-select |
| `src/app/(shell)/workers/client.tsx` | `WorkersClient` — reads from `useOrg().workers`, opens modal |
| `src/app/(shell)/workers/page.tsx` | Thin server wrapper with metadata |

### Modified files
| File | What changes |
|------|-------------|
| `src/types/domain.ts` | Add `"carpenter"` to `WorkerRole`; add `skills: string[]` to `OrgWorker`; add `CreateWorkerInput` |
| `src/lib/mock/workers.ts` | Add `skills: []` to all 12 existing workers |
| `src/lib/registry/workforce.ts` | Add `"carpenter"` to `KNOWN_WORKER_ROLES`; add `skills: []` in `toOrgWorker` |
| `src/providers/OrgProvider.tsx` | Add `skillCatalog` state; expose `setWorkers`; add `addWorker` and `addSkillToRole` mutators |
| `src/lib/nav/nav-config.ts` | Add `Workers` to Core nav section |
| `src/components/layout/Topbar.tsx` | Add `workers: "Workers"` to `getPageTitle` map |

---

## Task 1 — Type additions + mock data update

Add `"carpenter"` to `WorkerRole`, add `skills: string[]` to `OrgWorker`, add `CreateWorkerInput`, update all mock workers to include `skills: []`, and update the registry's safe-coercion set.

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/lib/mock/workers.ts`
- Modify: `src/lib/registry/workforce.ts`

- [ ] **Step 1: Update `src/types/domain.ts`**

Replace the `WorkerRole` type, `OrgWorker` interface, and add `CreateWorkerInput`. Find these three blocks and replace them exactly:

```ts
// Replace existing WorkerRole (lines 96–103):
export type WorkerRole =
  | "mechanic"
  | "driver"
  | "mason"
  | "carpenter"
  | "foreman"
  | "superintendent"
  | "operator"
  | "laborer";

// Replace existing OrgWorker (lines 105–114):
export interface OrgWorker {
  id:        string;
  orgId:     string;
  name:      string;
  role:      WorkerRole;
  userId:    string | null;  // null until worker has an AIGACP login
  available: boolean;
  skills:    string[];
  projectId?: string;
  siteName?:  string;
}

// Add CreateWorkerInput after CreateCrewInput (at end of file):
export interface CreateWorkerInput {
  name:   string;
  role:   WorkerRole;
  skills: string[];
}
```

- [ ] **Step 2: Update `src/lib/mock/workers.ts`**

Add `skills: []` to every worker entry. Full file replacement:

```ts
import type { OrgWorker } from "@/types/domain";

export const MOCK_WORKERS: OrgWorker[] = [
  // Mechanics
  { id: "worker_001", orgId: "org_aiga_001", name: "Tony Reeves",    role: "mechanic",       userId: "cru_w_001", available: true,  skills: [], projectId: "proj_highland_002", siteName: "Highland Tower — Phase 2" },
  { id: "worker_002", orgId: "org_aiga_001", name: "Derek Walsh",    role: "mechanic",       userId: null,        available: true,  skills: [], projectId: "proj_eastside_007", siteName: "Eastside Medical Campus" },
  { id: "worker_003", orgId: "org_aiga_001", name: "Carlos Mejia",   role: "mechanic",       userId: null,        available: true,  skills: [] },
  { id: "worker_004", orgId: "org_aiga_001", name: "Priya Nair",     role: "mechanic",       userId: null,        available: false, skills: [] },

  // Drivers
  { id: "worker_005", orgId: "org_aiga_001", name: "Marco Ruiz",     role: "driver",         userId: null,        available: true,  skills: [], projectId: "proj_riverside_006", siteName: "Riverside District Parking" },
  { id: "worker_006", orgId: "org_aiga_001", name: "Jean Lafleur",   role: "driver",         userId: null,        available: true,  skills: [] },
  { id: "worker_007", orgId: "org_aiga_001", name: "Kenji Tanaka",   role: "driver",         userId: null,        available: false, skills: [] },

  // Masons
  { id: "worker_008", orgId: "org_aiga_001", name: "Luis Torres",    role: "mason",          userId: null,        available: true,  skills: [], projectId: "proj_highland_002", siteName: "Highland Tower — Phase 2" },
  { id: "worker_009", orgId: "org_aiga_001", name: "Ahmed Siddiqui", role: "mason",          userId: null,        available: true,  skills: [] },
  { id: "worker_010", orgId: "org_aiga_001", name: "Bruno Costa",    role: "mason",          userId: null,        available: false, skills: [] },

  // Foremen / Superintendents
  { id: "worker_011", orgId: "org_aiga_001", name: "Marcus Jimenez", role: "foreman",        userId: null,        available: true,  skills: [], projectId: "proj_highland_002", siteName: "Highland Tower — Phase 2" },
  { id: "worker_012", orgId: "org_aiga_001", name: "Carmen Nguyen",  role: "superintendent", userId: null,        available: true,  skills: [], projectId: "proj_oakridge_001", siteName: "Oakridge Industrial Complex" },
];
```

- [ ] **Step 3: Update `src/lib/registry/workforce.ts`**

Add `"carpenter"` to `KNOWN_WORKER_ROLES` and `skills: []` to `toOrgWorker`. Replace the two blocks:

```ts
// Replace KNOWN_WORKER_ROLES:
const KNOWN_WORKER_ROLES = new Set<WorkerRole>([
  "mechanic", "driver", "mason", "carpenter", "foreman", "superintendent", "operator", "laborer",
]);

// Replace toOrgWorker function:
function toOrgWorker(orgId: string) {
  return (w: CruWorker): OrgWorker => ({
    id:        w.id,
    name:      w.name,
    role:      toWorkerRole(w.role),
    orgId,
    userId:    null,
    projectId: w.siteId,
    siteName:  w.siteName,
    available: w.available,
    skills:    [],
  });
}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/domain.ts src/lib/mock/workers.ts src/lib/registry/workforce.ts
git commit -m "feat(types): add carpenter role, skills field to OrgWorker, CreateWorkerInput"
```

---

## Task 2 — Skill catalog + OrgProvider additions

Create the skill catalog mock and wire `addWorker`, `addSkillToRole`, and `skillCatalog` into OrgProvider.

**Files:**
- Create: `src/lib/mock/skills.ts`
- Modify: `src/providers/OrgProvider.tsx`

- [ ] **Step 1: Create `src/lib/mock/skills.ts`**

```ts
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

- [ ] **Step 2: Update `src/providers/OrgProvider.tsx`**

This file needs 5 targeted changes. Apply them in order:

**Change A — Add imports** (after the existing domain type import block at lines 6–9):

```ts
import type {
  Issue, ActivityEvent, Project, Asset, OrgWorker, OrgCrew,
  CreateProjectInput, CreateAssetInput, CreateCrewInput,
  CreateWorkerInput, WorkerRole,
} from "@/types/domain";
import { SKILL_CATALOG } from "@/lib/mock/skills";
```

**Change B — Add to `OrgContextValue` interface** (after the `addCrew` line at line 41):

```ts
  skillCatalog:   Record<WorkerRole, string[]>;
  addWorker:      (input: CreateWorkerInput) => OrgWorker;
  addSkillToRole: (role: WorkerRole, skill: string) => void;
```

**Change C — Expose `setWorkers`** (replace the workers state line at line 75):

```ts
  const [workers, setWorkers] = useState<OrgWorker[]>(MOCK_WORKERS.filter((w) => w.orgId === orgId));
```

**Change D — Add `skillCatalog` state** (after the `[workers, setWorkers]` line):

```ts
  const [skillCatalog, setSkillCatalog] = useState<Record<WorkerRole, string[]>>(
    () => ({
      operator:       [...SKILL_CATALOG.operator],
      driver:         [...SKILL_CATALOG.driver],
      mechanic:       [...SKILL_CATALOG.mechanic],
      mason:          [...SKILL_CATALOG.mason],
      carpenter:      [...SKILL_CATALOG.carpenter],
      laborer:        [...SKILL_CATALOG.laborer],
      foreman:        [...SKILL_CATALOG.foreman],
      superintendent: [...SKILL_CATALOG.superintendent],
    })
  );
```

**Change E — Add `addWorker` and `addSkillToRole` functions** (after the `addCrew` function, before `const enabledModules`):

```ts
  function addWorker(input: CreateWorkerInput): OrgWorker {
    const worker: OrgWorker = {
      id:        crypto.randomUUID(),
      orgId,
      name:      input.name,
      role:      input.role,
      userId:    null,
      available: true,
      skills:    input.skills,
    };
    setWorkers((prev) => [worker, ...prev]);
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      "added worker to the roster",
      entity_type: "worker",
      entity_name: worker.name,
      project_id:  config.currentProject.id,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
    return worker;
  }

  function addSkillToRole(role: WorkerRole, skill: string): void {
    setSkillCatalog((prev) => ({
      ...prev,
      [role]: [...prev[role], skill],
    }));
  }
```

**Change F — Add to the context provider value** (in the `<OrgContext.Provider value={{...}}>` block, after `addCrew`):

```ts
        skillCatalog,
        addWorker,
        addSkillToRole,
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/mock/skills.ts src/providers/OrgProvider.tsx
git commit -m "feat(provider): add skill catalog, addWorker, addSkillToRole to OrgProvider"
```

---

## Task 3 — AddWorkerModal

2-step modal: step 1 collects name and role; step 2 shows the role's skill pool as a multi-select, with an inline "Add skill" input visible only to superintendent+ roles.

**Files:**
- Create: `src/components/shell/AddWorkerModal.tsx`

- [ ] **Step 1: Create `src/components/shell/AddWorkerModal.tsx`**

```tsx
"use client";

import { useState } from "react";
import { X, Check, Plus } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import type { CreateWorkerInput, WorkerRole } from "@/types/domain";

interface Props {
  onClose:   () => void;
  onCreated: (workerId: string) => void;
}

type Step = "details" | "skills";

const WORKER_ROLES: { value: WorkerRole; label: string }[] = [
  { value: "carpenter",      label: "Carpenter" },
  { value: "driver",         label: "Driver" },
  { value: "foreman",        label: "Foreman" },
  { value: "laborer",        label: "Laborer" },
  { value: "mason",          label: "Mason" },
  { value: "mechanic",       label: "Mechanic" },
  { value: "operator",       label: "Operator" },
  { value: "superintendent", label: "Superintendent" },
];

// Roles that can add new skills to the catalog
const CAN_ADD_SKILLS = new Set(["owner", "admin", "superintendent"]);

export function AddWorkerModal({ onClose, onCreated }: Props) {
  const { addWorker, addSkillToRole, skillCatalog, role: userRole } = useOrg();

  const [step, setStep]                     = useState<Step>("details");
  const [name, setName]                     = useState("");
  const [workerRole, setWorkerRole]         = useState<WorkerRole>("laborer");
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [customSkill, setCustomSkill]       = useState("");
  const [error, setError]                   = useState("");

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      next.has(skill) ? next.delete(skill) : next.add(skill);
      return next;
    });
  }

  function handleDetailsNext(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Worker name is required."); return; }
    setError("");
    setStep("skills");
  }

  function handleAddCustomSkill() {
    const trimmed = customSkill.trim();
    if (!trimmed) return;
    addSkillToRole(workerRole, trimmed);
    setSelectedSkills((prev) => new Set(prev).add(trimmed));
    setCustomSkill("");
  }

  function handleSubmit() {
    const input: CreateWorkerInput = {
      name:   name.trim(),
      role:   workerRole,
      skills: Array.from(selectedSkills),
    };
    const worker = addWorker(input);
    onCreated(worker.id);
    onClose();
  }

  const roleSkills   = skillCatalog[workerRole] ?? [];
  const canAddSkills = CAN_ADD_SKILLS.has(userRole);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface-base border border-surface-border rounded-[var(--radius-card)] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div>
            <h2 className="text-sm font-semibold text-content-primary">Add Worker</h2>
            <p className="text-xs text-content-muted mt-0.5">
              Step {step === "details" ? "1" : "2"} of 2 —{" "}
              {step === "details" ? "Worker details" : "Assign skills"}
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
              <label className="block text-xs font-medium text-content-secondary mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">Role</label>
              <select
                value={workerRole}
                onChange={(e) => {
                  setWorkerRole(e.target.value as WorkerRole);
                  setSelectedSkills(new Set());
                }}
                className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
              >
                {WORKER_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
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
                Next: Assign Skills
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Skills */}
        {step === "skills" && (
          <div className="px-5 py-4">
            <p className="text-xs text-content-muted mb-3">
              {selectedSkills.size} skill{selectedSkills.size !== 1 ? "s" : ""} selected
            </p>

            <div className="space-y-1 max-h-52 overflow-y-auto">
              {roleSkills.map((skill) => {
                const selected = selectedSkills.has(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-left transition-colors ${
                      selected
                        ? "bg-gold/10 border border-gold/30"
                        : "bg-surface-overlay border border-transparent hover:border-surface-border"
                    }`}
                  >
                    <p className="text-sm text-content-primary">{skill}</p>
                    {selected && <Check size={14} className="text-gold shrink-0" />}
                  </button>
                );
              })}
              {roleSkills.length === 0 && (
                <p className="text-xs text-content-muted text-center py-4">No skills defined for this role.</p>
              )}
            </div>

            {canAddSkills && (
              <div className="mt-3 pt-3 border-t border-surface-border">
                <p className="text-xs text-content-muted mb-2">Add a skill to this role</p>
                <div className="flex gap-2">
                  <input
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomSkill(); } }}
                    placeholder="Skill name..."
                    className="flex-1 text-sm bg-surface-overlay border border-surface-border rounded px-3 py-1.5 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSkill}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-surface-overlay border border-surface-border rounded hover:border-gold text-content-secondary hover:text-content-primary transition-colors"
                  >
                    <Plus size={12} />
                    Add
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-2 pt-4 mt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={() => setStep("details")}
                className="px-4 py-2 text-xs text-content-secondary hover:text-content-primary transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
              >
                Add Worker
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/AddWorkerModal.tsx
git commit -m "feat(shell): add AddWorkerModal — 2-step worker creation with skill assignment"
```

---

## Task 4 — Workers page + nav wiring

Create the Workers page (server wrapper + client component) and add the Workers nav link.

**Files:**
- Create: `src/app/(shell)/workers/page.tsx`
- Create: `src/app/(shell)/workers/client.tsx`
- Modify: `src/lib/nav/nav-config.ts`
- Modify: `src/components/layout/Topbar.tsx`

- [ ] **Step 1: Create `src/app/(shell)/workers/page.tsx`**

```tsx
import { WorkersClient } from "./client";

export const metadata = { title: "Workers" };

export default function WorkersPage() {
  return <WorkersClient />;
}
```

- [ ] **Step 2: Create `src/app/(shell)/workers/client.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Plus, User } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { AddWorkerModal } from "@/components/shell/AddWorkerModal";
import { useOrg } from "@/providers/OrgProvider";

export function WorkersClient() {
  const { workers } = useOrg();
  const [showModal, setShowModal] = useState(false);

  const availableCount = workers.filter((w) => w.available).length;

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Workers"
        subtitle={`${workers.length} workers · ${availableCount} available`}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
          >
            <Plus size={13} />
            Add Worker
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map((worker) => {
          const visibleSkills = worker.skills.slice(0, 3);
          const extraCount    = worker.skills.length - visibleSkills.length;

          return (
            <Card key={worker.id} variant="default">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center">
                  <User size={16} className="text-content-secondary" />
                </div>
                <span
                  className={`w-2 h-2 rounded-full mt-1 ${worker.available ? "bg-green-400" : "bg-content-muted"}`}
                  title={worker.available ? "Available" : "Unavailable"}
                />
              </div>
              <p className="font-semibold text-content-primary text-sm">{worker.name}</p>
              <p className="text-xs text-content-muted mt-0.5 capitalize">{worker.role}</p>
              <div className="mt-3 pt-3 border-t border-surface-border">
                {worker.skills.length === 0 ? (
                  <p className="text-xs text-content-muted">No skills on file</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {visibleSkills.map((skill) => (
                      <span
                        key={skill}
                        className="text-xs bg-surface-overlay border border-surface-border rounded px-2 py-0.5 text-content-secondary"
                      >
                        {skill}
                      </span>
                    ))}
                    {extraCount > 0 && (
                      <span className="text-xs bg-surface-overlay border border-surface-border rounded px-2 py-0.5 text-content-muted">
                        +{extraCount} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {showModal && (
        <AddWorkerModal
          onClose={() => setShowModal(false)}
          onCreated={(_workerId) => setShowModal(false)}
        />
      )}
    </PageContainer>
  );
}
```

- [ ] **Step 3: Add Workers to nav config**

In `src/lib/nav/nav-config.ts`, add the Workers item to the Core section after `Crews`:

```ts
// Before (Core items array):
{ label: "Dashboard",  href: "/dashboard", icon: "LayoutDashboard" },
{ label: "Projects",   href: "/projects",  icon: "Building2" },
{ label: "Assets",     href: "/assets",    icon: "Truck" },
{ label: "Crews",      href: "/crews",     icon: "HardHat" },
{ label: "Activity",   href: "/activity",  icon: "Activity" },

// After:
{ label: "Dashboard",  href: "/dashboard", icon: "LayoutDashboard" },
{ label: "Projects",   href: "/projects",  icon: "Building2" },
{ label: "Assets",     href: "/assets",    icon: "Truck" },
{ label: "Crews",      href: "/crews",     icon: "HardHat" },
{ label: "Workers",    href: "/workers",   icon: "Users" },
{ label: "Activity",   href: "/activity",  icon: "Activity" },
```

The `Users` icon is already registered in `src/components/layout/Sidebar.tsx`'s `ICON_MAP`.

- [ ] **Step 4: Add Workers to Topbar page title map**

In `src/components/layout/Topbar.tsx`, add `workers` to the `map` object inside `getPageTitle`:

```ts
// Add after the "crews" entry:
workers:              "Workers",
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/(shell)/workers/page.tsx src/app/(shell)/workers/client.tsx src/lib/nav/nav-config.ts src/components/layout/Topbar.tsx
git commit -m "feat(shell): add Workers page, wire nav link — shows roster with skills"
```
