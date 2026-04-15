# Worker Inspector Panel Design

Date: 2026-04-15  
Status: Approved  
Phase coverage: Phase 1–2 (mock data, in-memory)

---

## 1. Overview

Clicking a worker card on `/workers` opens a right-side inspector panel showing that worker's full detail — assignment, crew, skills, availability. Superintendents and above can edit skills and crew assignment. Admins and owners can also reassign the worker to a different project.

Uses the existing `InspectorPanel` component (same pattern as `WoInspectorPanel` in MX).

---

## 2. Workers Page Changes

### 2.1 Clickable cards

Each worker card becomes a button. Clicking sets `selectedWorkerId` state in `WorkersClient`. The `WorkerInspectorPanel` is rendered at the bottom of the page, controlled by `selectedWorkerId`.

### 2.2 Role-based list filter

| Role | Workers visible |
|------|----------------|
| `owner`, `admin` | All org workers |
| `superintendent` | Workers where `worker.projectId === currentProject.id` only |
| All others | All org workers |

This filter applies to the list, not to the inspector panel. If a superintendent opens a worker's panel (from their filtered list), the worker is always on their project.

---

## 3. Worker Inspector Panel

### 3.1 Trigger

```tsx
// WorkersClient
const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

// Each card
<Card ... onClick={() => setSelectedWorkerId(worker.id)} className="cursor-pointer hover:border-surface-border-hover transition-colors">

// Panel
<WorkerInspectorPanel
  workerId={selectedWorkerId}
  onClose={() => setSelectedWorkerId(null)}
/>
```

### 3.2 Panel layout

**Header (via InspectorPanel props):**
- `subtitle`: `"Worker · [role capitalized]"`
- `title`: worker name

**Body sections (inside scrollable panel body):**

1. Assignment
2. Skills
3. Availability

---

### 3.3 Assignment section

**Read-only view (all roles):**

```
Project    [Oakridge Industrial Complex]    ← project name or "Unassigned"
Crew       [Foundation Crew A]             ← crew name or "No crew assigned"
```

**Edit controls — superintendent, admin, owner only:**

A "Reassign" button below the read-only view toggles an edit form.

**For admin / owner:**
- Project dropdown: all projects from `useOrg().projects`
- Crew dropdown: crews filtered to `projectId === selectedProjectId` (updates when project changes)
- Changing project clears the crew selection

**For superintendent:**
- Project: read-only text (their `currentProject.name`) — no dropdown
- Crew dropdown: `crews.filter(c => c.projectId === currentProject.id)`

**On confirm:**
Calls `reassignWorker(workerId, projectId, crewId)`.

`crewId` may be undefined if the user picks "No crew" (an explicit unassign option at top of the crew dropdown).

### 3.4 Skills section

**Read-only (all roles):**
Skills displayed as tags. "No skills on file" if empty.

**Edit mode (superintendent / admin / owner):**

Toggled by an "Edit skills" button. In edit mode:
- Each existing skill tag shows an `×` button → removes that skill immediately (optimistic, calls `updateWorkerSkills`)
- "Add skill" button opens an inline picker:
  - Checkboxes for skills in `skillCatalog[worker.role]` not already on the worker
  - Custom skill input + Add (visible to superintendent / admin / owner — same gate as the modal)
  - "Done" closes the picker and saves via `updateWorkerSkills(workerId, newSkills)`

### 3.5 Availability section

Green dot + "Available" or grey dot + "Unavailable". Read-only in Phase 1–2.

---

## 4. OrgProvider Additions

### 4.1 New mutators

```ts
// Updates the worker's skills array in-place
updateWorkerSkills(workerId: string, skills: string[]): void

// Moves worker to a new project and/or crew
// - Updates worker.projectId (and clears worker.siteName — no siteName picker in UI)
// - Removes worker from their current crew's memberIds (if any)
// - Adds worker to the new crew's memberIds (if crewId provided)
// - Emits activity event
reassignWorker(workerId: string, projectId: string | undefined, crewId: string | undefined): void
```

### 4.2 Activity events

`updateWorkerSkills`: no activity event (skill edits are low-signal noise).

`reassignWorker`:
```
"[currentUser.name] reassigned [worker.name] to [crew.name]"       — if crew provided
"[currentUser.name] moved [worker.name] to [project.name]"         — if project changed, no crew
"[currentUser.name] removed [worker.name] from project assignment"  — if projectId is undefined
```
module: "shell", entity_type: "worker", project_id: new projectId ?? currentProject.id.

### 4.3 Implementation notes

`reassignWorker`:
```ts
function reassignWorker(workerId: string, projectId: string | undefined, crewId: string | undefined) {
  // 1. Update worker.projectId
  setWorkers((prev) =>
    prev.map((w) =>
      w.id === workerId ? { ...w, projectId, siteName: undefined } : w
    )
  );
  // 2. Remove from current crew
  setCrews((prev) =>
    prev.map((c) => ({
      ...c,
      memberIds: c.memberIds.filter((id) => id !== workerId),
    }))
  );
  // 3. Add to new crew
  if (crewId) {
    setCrews((prev) =>
      prev.map((c) =>
        c.id === crewId ? { ...c, memberIds: [...c.memberIds, workerId] } : c
      )
    );
  }
  // 4. Emit activity
  ...
}
```

`updateWorkerSkills`:
```ts
function updateWorkerSkills(workerId: string, skills: string[]) {
  setWorkers((prev) =>
    prev.map((w) => (w.id === workerId ? { ...w, skills } : w))
  );
}
```

---

## 5. Permission Summary

| Action | Owner | Admin | Superintendent | Others |
|--------|-------|-------|----------------|--------|
| View worker panel | ✓ | ✓ | ✓ (own project) | ✓ |
| Edit skills (add/remove) | ✓ | ✓ | ✓ | — |
| Add custom skill to catalog | ✓ | ✓ | ✓ | — |
| Change crew assignment | ✓ | ✓ | ✓ (own project crews) | — |
| Change project assignment | ✓ | ✓ | — | — |

---

## 6. Files

### New
| File | Purpose |
|------|---------|
| `src/components/shell/WorkerInspectorPanel.tsx` | Right-side inspector panel for worker detail + editing |

### Modified
| File | What changes |
|------|-------------|
| `src/providers/OrgProvider.tsx` | Add `updateWorkerSkills` and `reassignWorker` mutators |
| `src/app/(shell)/workers/client.tsx` | Clickable cards, role-based filter, selectedWorkerId state, render panel |

---

## 7. Out of scope (Phase 1–2)

- Editing worker name or role (add-only for now)
- Availability toggle
- Worker profile photo
- Activity history for a specific worker
