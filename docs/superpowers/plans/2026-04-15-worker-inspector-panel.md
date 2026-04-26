# Worker Inspector Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make worker cards clickable and open a right-side inspector panel for viewing and editing worker assignment, skills, and availability.

**Architecture:** Three discrete changes — (1) add two new mutators to OrgProvider, (2) build the WorkerInspectorPanel component using the existing InspectorPanel, (3) update WorkersClient with clickable cards, a superintendent filter, and panel rendering.

**Tech Stack:** Next.js 14 App Router, React hooks, TypeScript, Tailwind CSS, in-memory OrgProvider state (Phase 1–2)

---

## File Map

| File | Change |
|------|--------|
| `src/providers/OrgProvider.tsx` | Add `updateWorkerSkills` + `reassignWorker` mutators |
| `src/components/shell/WorkerInspectorPanel.tsx` | New — right-side inspector for worker detail + editing |
| `src/app/(shell)/workers/client.tsx` | Clickable cards, superintendent filter, selectedWorkerId, render panel |

---

### Task 1: OrgProvider — add `updateWorkerSkills` and `reassignWorker`

**Files:**
- Modify: `src/providers/OrgProvider.tsx`

- [ ] **Step 1: Add mutator signatures to `OrgContextValue` interface**

In `src/providers/OrgProvider.tsx`, find the `OrgContextValue` interface and add two new lines after `addSkillToRole`:

```ts
  addSkillToRole: (role: WorkerRole, skill: string) => void;
  // ── new ──
  updateWorkerSkills: (workerId: string, skills: string[]) => void;
  reassignWorker:     (workerId: string, projectId: string | undefined, crewId: string | undefined) => void;
```

- [ ] **Step 2: Implement `updateWorkerSkills`**

Add this function inside `OrgProvider`, after `addSkillToRole`:

```ts
  function updateWorkerSkills(workerId: string, skills: string[]): void {
    setWorkers((prev) =>
      prev.map((w) => (w.id === workerId ? { ...w, skills } : w))
    );
  }
```

- [ ] **Step 3: Implement `reassignWorker`**

Add this function directly after `updateWorkerSkills`:

```ts
  function reassignWorker(
    workerId: string,
    projectId: string | undefined,
    crewId: string | undefined,
  ): void {
    const worker  = workers.find((w) => w.id === workerId);
    if (!worker) return;

    // 1. Update worker.projectId, clear siteName
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === workerId ? { ...w, projectId, siteName: undefined } : w,
      ),
    );

    // 2. Remove worker from all crew memberIds
    setCrews((prev) =>
      prev.map((c) => ({
        ...c,
        memberIds: c.memberIds.filter((id) => id !== workerId),
      })),
    );

    // 3. Add to new crew if provided
    if (crewId) {
      setCrews((prev) =>
        prev.map((c) =>
          c.id === crewId ? { ...c, memberIds: [...c.memberIds, workerId] } : c,
        ),
      );
    }

    // 4. Emit activity — read names from current state snapshot
    const crew    = crewId    ? crews.find((c) => c.id === crewId)       : undefined;
    const project = projectId ? projects.find((p) => p.id === projectId) : undefined;

    let action: string;
    if (crewId && crew) {
      action = `reassigned ${worker.name} to ${crew.name}`;
    } else if (projectId && project) {
      action = `moved ${worker.name} to ${project.name}`;
    } else {
      action = `removed ${worker.name} from project assignment`;
    }

    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action,
      entity_type: "worker",
      entity_name: worker.name,
      project_id:  projectId ?? config.currentProject.id,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
  }
```

- [ ] **Step 4: Expose mutators in the context value object**

In the `<OrgContext.Provider value={{ ... }}>` block, add after `addSkillToRole`:

```ts
        addSkillToRole,
        updateWorkerSkills,
        reassignWorker,
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit
```

Expected: no errors related to `updateWorkerSkills` or `reassignWorker`.

- [ ] **Step 6: Commit**

```bash
git add src/providers/OrgProvider.tsx
git commit -m "feat(shell): add updateWorkerSkills and reassignWorker to OrgProvider"
```

---

### Task 2: WorkerInspectorPanel component

**Files:**
- Create: `src/components/shell/WorkerInspectorPanel.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/shell/WorkerInspectorPanel.tsx` with the full component:

```tsx
"use client";

import { useState, useEffect } from "react";
import { InspectorPanel } from "@/components/ui/InspectorPanel";
import { useOrg } from "@/providers/OrgProvider";
import type { UserRole } from "@/types/org";

const CAN_EDIT           = new Set<UserRole>(["owner", "admin", "superintendent"]);
const CAN_CHANGE_PROJECT = new Set<UserRole>(["owner", "admin"]);

interface WorkerInspectorPanelProps {
  workerId: string | null;
  onClose:  () => void;
}

export function WorkerInspectorPanel({ workerId, onClose }: WorkerInspectorPanelProps) {
  const {
    workers, crews, projects, skillCatalog,
    currentProject, role,
    updateWorkerSkills, reassignWorker, addSkillToRole,
  } = useOrg();

  const worker = workerId ? (workers.find((w) => w.id === workerId) ?? null) : null;

  // Reassign form state
  const [showReassign,     setShowReassign]     = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [selectedCrewId,    setSelectedCrewId]    = useState<string | undefined>();

  // Skills edit state
  const [editSkills,       setEditSkills]       = useState(false);
  const [showSkillPicker,  setShowSkillPicker]  = useState(false);
  const [pickerSelected,   setPickerSelected]   = useState<Set<string>>(new Set());
  const [customSkillInput, setCustomSkillInput] = useState("");

  // Reset all panel state whenever the selected worker changes
  useEffect(() => {
    setShowReassign(false);
    setEditSkills(false);
    setShowSkillPicker(false);
    setPickerSelected(new Set());
    setCustomSkillInput("");
    setSelectedProjectId(worker?.projectId);
    setSelectedCrewId(undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);

  const canEdit          = CAN_EDIT.has(role);
  const canChangeProject = CAN_CHANGE_PROJECT.has(role);

  // Derived: current project + crew for read-only display
  const workerProject = worker?.projectId
    ? projects.find((p) => p.id === worker.projectId)
    : undefined;
  const currentCrew = worker
    ? crews.find((c) => c.memberIds.includes(worker.id))
    : undefined;

  // Crews available in the reassign form — scoped to the selected (or current) project
  const reassignProjectId = canChangeProject ? selectedProjectId : currentProject.id;
  const projectCrews = crews.filter((c) => c.projectId === reassignProjectId);

  // Skills not already on the worker (for picker)
  const availableSkills = worker
    ? (skillCatalog[worker.role] ?? []).filter((s) => !worker.skills.includes(s))
    : [];

  function handleRemoveSkill(skill: string) {
    if (!worker) return;
    updateWorkerSkills(worker.id, worker.skills.filter((s) => s !== skill));
  }

  function handlePickerToggle(skill: string, checked: boolean) {
    setPickerSelected((prev) => {
      const next = new Set(prev);
      checked ? next.add(skill) : next.delete(skill);
      return next;
    });
  }

  function handlePickerDone() {
    if (!worker) return;
    if (pickerSelected.size > 0) {
      updateWorkerSkills(worker.id, [...worker.skills, ...Array.from(pickerSelected)]);
    }
    setPickerSelected(new Set());
    setShowSkillPicker(false);
  }

  function handleAddCustomSkill() {
    const trimmed = customSkillInput.trim();
    if (!trimmed || !worker) return;
    addSkillToRole(worker.role, trimmed);
    setPickerSelected((prev) => new Set([...prev, trimmed]));
    setCustomSkillInput("");
  }

  function handleConfirmReassign() {
    if (!worker) return;
    reassignWorker(worker.id, reassignProjectId, selectedCrewId);
    setShowReassign(false);
  }

  const subtitle = worker
    ? `Worker · ${worker.role.charAt(0).toUpperCase() + worker.role.slice(1)}`
    : undefined;

  return (
    <InspectorPanel
      open={!!worker}
      onClose={onClose}
      title={worker?.name ?? ""}
      subtitle={subtitle}
    >
      {worker && (
        <div className="px-5 py-4 space-y-5">

          {/* ── Assignment ─────────────────────────────────────────────── */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Assignment
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-content-muted">Project</span>
                <span className="font-semibold text-content-primary">
                  {workerProject?.name ?? "Unassigned"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-content-muted">Crew</span>
                <span className="font-semibold text-content-primary">
                  {currentCrew?.name ?? "No crew assigned"}
                </span>
              </div>
            </div>

            {canEdit && !showReassign && (
              <button
                onClick={() => setShowReassign(true)}
                className="mt-3 text-[10px] font-semibold text-content-muted hover:text-teal transition-colors"
              >
                Reassign
              </button>
            )}

            {showReassign && (
              <div className="mt-3 border border-surface-border rounded-lg p-3 space-y-3">
                {/* Project: dropdown for admin/owner, read-only text for superintendent */}
                {canChangeProject ? (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1.5">
                      Project
                    </label>
                    <select
                      value={selectedProjectId ?? ""}
                      onChange={(e) => {
                        setSelectedProjectId(e.target.value || undefined);
                        setSelectedCrewId(undefined);
                      }}
                      className="w-full text-xs bg-surface-overlay border border-surface-border rounded-lg px-2.5 py-1.5 text-content-primary focus:outline-none focus:border-teal"
                    >
                      <option value="">Unassigned</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1">
                      Project
                    </p>
                    <p className="text-xs text-content-primary">{currentProject.name}</p>
                  </div>
                )}

                {/* Crew dropdown */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1.5">
                    Crew
                  </label>
                  <select
                    value={selectedCrewId ?? ""}
                    onChange={(e) => setSelectedCrewId(e.target.value || undefined)}
                    className="w-full text-xs bg-surface-overlay border border-surface-border rounded-lg px-2.5 py-1.5 text-content-primary focus:outline-none focus:border-teal"
                  >
                    <option value="">No crew</option>
                    {projectCrews.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleConfirmReassign}
                    className="px-3 py-1 text-[10px] font-semibold bg-teal text-white rounded hover:opacity-90 transition-opacity"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowReassign(false)}
                    className="text-[10px] text-content-muted hover:text-content-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── Skills ─────────────────────────────────────────────────── */}
          <section className="border-t border-surface-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted">
                Skills
              </h3>
              {canEdit && !editSkills && (
                <button
                  onClick={() => setEditSkills(true)}
                  className="text-[10px] font-semibold text-content-muted hover:text-teal transition-colors"
                >
                  Edit skills
                </button>
              )}
              {editSkills && (
                <button
                  onClick={() => { setEditSkills(false); setShowSkillPicker(false); setPickerSelected(new Set()); }}
                  className="text-[10px] font-semibold text-teal hover:opacity-80 transition-opacity"
                >
                  Done editing
                </button>
              )}
            </div>

            {/* Skills tags */}
            {worker.skills.length === 0 && !editSkills && (
              <p className="text-xs text-content-muted">No skills on file</p>
            )}
            {(worker.skills.length > 0 || editSkills) && (
              <div className="flex flex-wrap gap-1.5">
                {worker.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 text-xs bg-surface-overlay border border-surface-border rounded px-2 py-0.5 text-content-secondary"
                  >
                    {skill}
                    {editSkills && (
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-content-muted hover:text-status-critical transition-colors leading-none ml-0.5"
                        aria-label={`Remove ${skill}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {editSkills && !showSkillPicker && (
                  <button
                    onClick={() => setShowSkillPicker(true)}
                    className="text-xs bg-surface-overlay border border-dashed border-surface-border-hover rounded px-2 py-0.5 text-content-muted hover:text-teal hover:border-teal/40 transition-colors"
                  >
                    + Add skill
                  </button>
                )}
              </div>
            )}

            {/* Inline skill picker */}
            {showSkillPicker && (
              <div className="mt-3 border border-teal/20 bg-teal/5 rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-teal/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-teal">Add Skills</p>
                </div>
                <div className="p-2 max-h-48 overflow-y-auto space-y-0.5">
                  {availableSkills.length === 0 ? (
                    <p className="text-xs text-content-muted py-2 text-center">All catalog skills already added.</p>
                  ) : (
                    availableSkills.map((skill) => (
                      <label
                        key={skill}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-overlay cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={pickerSelected.has(skill)}
                          onChange={(e) => handlePickerToggle(skill, e.target.checked)}
                          className="accent-teal"
                        />
                        <span className="text-xs text-content-primary">{skill}</span>
                      </label>
                    ))
                  )}
                </div>
                {/* Custom skill input — same gate as modal (superintendent/admin/owner) */}
                {canEdit && (
                  <div className="px-3 py-2 border-t border-teal/20 flex items-center gap-2">
                    <input
                      type="text"
                      value={customSkillInput}
                      onChange={(e) => setCustomSkillInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddCustomSkill(); }}
                      placeholder="Custom skill…"
                      className="flex-1 text-xs bg-surface-overlay border border-surface-border rounded px-2 py-1 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-teal"
                    />
                    <button
                      onClick={handleAddCustomSkill}
                      className="text-xs px-2.5 py-1 bg-surface-overlay border border-surface-border rounded hover:border-teal/40 text-content-secondary transition-colors"
                    >
                      Add
                    </button>
                  </div>
                )}
                <div className="px-3 py-2 border-t border-teal/20 flex items-center gap-2">
                  <button
                    onClick={handlePickerDone}
                    className="px-3 py-1 text-[10px] font-semibold bg-teal text-white rounded hover:opacity-90 transition-opacity"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => { setShowSkillPicker(false); setPickerSelected(new Set()); }}
                    className="text-[10px] text-content-muted hover:text-content-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── Availability ───────────────────────────────────────────── */}
          <section className="border-t border-surface-border pt-4 pb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Availability
            </h3>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${worker.available ? "bg-green-400" : "bg-content-muted"}`}
              />
              <span className="text-xs text-content-primary">
                {worker.available ? "Available" : "Unavailable"}
              </span>
            </div>
          </section>

        </div>
      )}
    </InspectorPanel>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit
```

Expected: no errors in `WorkerInspectorPanel.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/WorkerInspectorPanel.tsx
git commit -m "feat(shell): add WorkerInspectorPanel component"
```

---

### Task 3: WorkersClient — clickable cards, filter, and panel

**Files:**
- Modify: `src/app/(shell)/workers/client.tsx`

- [ ] **Step 1: Rewrite the client with all changes**

Replace the full contents of `src/app/(shell)/workers/client.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Plus, User } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { AddWorkerModal } from "@/components/shell/AddWorkerModal";
import { WorkerInspectorPanel } from "@/components/shell/WorkerInspectorPanel";
import { useOrg } from "@/providers/OrgProvider";

export function WorkersClient() {
  const { workers, role, currentProject } = useOrg();
  const [showModal,        setShowModal]        = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  // Superintendents see only workers on their current project
  const filteredWorkers =
    role === "superintendent"
      ? workers.filter((w) => w.projectId === currentProject.id)
      : workers;

  const availableCount = filteredWorkers.filter((w) => w.available).length;

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Workers"
        subtitle={`${filteredWorkers.length} workers · ${availableCount} available`}
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
        {filteredWorkers.map((worker) => {
          const visibleSkills = worker.skills.slice(0, 3);
          const extraCount    = worker.skills.length - visibleSkills.length;
          const isSelected    = worker.id === selectedWorkerId;

          return (
            <Card
              key={worker.id}
              variant="default"
              onClick={() => setSelectedWorkerId(worker.id)}
              className={`cursor-pointer hover:border-surface-border-hover transition-colors ${isSelected ? "border-teal/50" : ""}`}
            >
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

      <WorkerInspectorPanel
        workerId={selectedWorkerId}
        onClose={() => setSelectedWorkerId(null)}
      />
    </PageContainer>
  );
}
```

- [ ] **Step 2: Confirm `Card` `onClick` prop works as expected**

`Card` already accepts `onClick` and renders as a `<button>` when provided — no changes to Card needed. The code in Step 1 is correct as written.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Manual smoke test**

Start dev server if not running:
```bash
cd /Users/tui/aigacp && npm run dev
```

Verify in browser at `http://localhost:3000/workers`:
- [ ] Clicking a worker card opens the right-side panel (title = worker name, subtitle = "Worker · [Role]")
- [ ] Escape key or backdrop click closes the panel
- [ ] Panel Assignment section shows project name (or "Unassigned") and crew (or "No crew assigned")
- [ ] As `owner` or `admin` role: "Reassign" button appears; clicking shows project + crew dropdowns; confirming updates the panel display and emits activity
- [ ] As `superintendent` role: worker list filtered to current project workers; "Reassign" shows read-only project name + crew dropdown for same project only
- [ ] As `foreman` role: panel opens but no edit buttons visible
- [ ] Skills section shows tags; "Edit skills" visible for admin/owner/superintendent
- [ ] In skills edit mode: × removes skill immediately; "+ Add skill" opens picker; custom skill input visible; Done saves additions
- [ ] Availability section shows green/grey dot + text

- [ ] **Step 5: Commit**

```bash
git add src/app/\(shell\)/workers/client.tsx
git commit -m "feat(shell): clickable worker cards with inspector panel"
```
