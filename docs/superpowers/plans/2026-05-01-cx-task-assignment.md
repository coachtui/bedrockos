# CX Task Assignment Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable supervisors and PMs to assign workers to tasks and manage day-level project assignments directly within the CX module.

**Architecture:** Three tasks build on each other. Task 1 adds `addAssignment`/`removeAssignment` mutators to `CxProvider`. Task 2 adds a live task reference fix to the schedule page and an "Assigned Workers" toggle section inside `TaskInspectorPanel` (same direct-mutation pattern as `CrewPanel`). Task 3 makes the weekly assignments grid interactive using the new mutators.

**Tech Stack:** Next.js 15 App Router, React, TypeScript strict, Tailwind CSS, `useReducer` in CxProvider

---

## Codebase Context (read before starting)

Key files already in place — do NOT recreate them:

- `src/providers/CxProvider.tsx` — `useReducer` with `CxState { tasks, events, assignments }`. Currently has `ADD_TASK`, `UPDATE_TASK`, `ADD_EVENT` but no assignment mutators.
- `src/lib/cx/types.ts` — defines `CxTask`, `CxEvent`, `CxDayAssignment`, `CxCrewRequirement`, `CreateCxTaskInput`.
- `src/components/cx/TaskInspectorPanel.tsx` — form panel for creating/editing a `CxTask`. Has `crewRequirements` UI but no worker assignment UI. `onSave` prop takes `CreateCxTaskInput`.
- `src/app/(shell)/modules/cru/schedule/page.tsx` — hosts `TaskInspectorPanel`. Uses `useState<CxTask | undefined>` for `selectedTask` (stale snapshot — Task 2 fixes this).
- `src/app/(shell)/modules/cru/assignments/page.tsx` — read-only weekly worker grid. UTC date bug in `getWeekDates` (Task 3 fixes).
- `src/components/cx/CrewPanel.tsx` — reference for the direct-mutation pattern: calls `addWorkerToCrew`/`removeWorkerFromCrew` from `useOrg()` directly, no save button needed for member toggles.
- `src/lib/utils/time.ts` — exports `localDateString()` for local-date strings, avoiding UTC offset bugs west of UTC.

**Role model** (from CLAUDE.md):
- `superintendent`, `project_engineer`, `pm`, `owner`, `admin` → can edit assignments
- `foreman` → read-only (cannot create assignments or toggle workers)
- `mechanic` → read-only

---

## File Structure

Files touched by this plan:

| File | Change |
|------|--------|
| `src/providers/CxProvider.tsx` | Add `ADD_ASSIGNMENT`, `REMOVE_ASSIGNMENT` actions + mutators |
| `src/app/(shell)/modules/cru/schedule/page.tsx` | Change `selectedTask` state to ID-based to avoid stale prop |
| `src/components/cx/TaskInspectorPanel.tsx` | Add "Assigned Workers" section in edit mode |
| `src/app/(shell)/modules/cru/assignments/page.tsx` | Fix UTC bug, make grid interactive |

**No new files needed.**

---

## Build Verification

This project has no test suite. Use `npm run build` as the gate after each task. A clean build (exit 0, no TypeScript errors) is the pass condition.

Run from the worktree root:
```bash
npm run build 2>&1 | tail -5
```
Expected pass output: last line is `○  (Static)` / `ƒ  (Dynamic)` route table — no red error lines.

---

## Task 1: CxProvider — assignment mutators

**Files:**
- Modify: `src/providers/CxProvider.tsx`

- [ ] **Step 1: Extend `CxAction` with assignment actions**

Open `src/providers/CxProvider.tsx`. Find the `type CxAction` union (currently 3 variants). Replace it with:

```ts
type CxAction =
  | { type: "ADD_TASK";          task:       CxTask }
  | { type: "UPDATE_TASK";       id:         string; patch: Partial<CxTask> }
  | { type: "ADD_EVENT";         event:      CxEvent }
  | { type: "ADD_ASSIGNMENT";    assignment: CxDayAssignment }
  | { type: "REMOVE_ASSIGNMENT"; id:         string };
```

- [ ] **Step 2: Add cases to `cxReducer`**

Inside `cxReducer`, add two cases before `default: return state`:

```ts
    case "ADD_ASSIGNMENT":
      return { ...state, assignments: [...state.assignments, action.assignment] };

    case "REMOVE_ASSIGNMENT":
      return { ...state, assignments: state.assignments.filter((a) => a.id !== action.id) };
```

- [ ] **Step 3: Add mutators to `CxContextValue` interface**

Find `interface CxContextValue`. Add two entries after `addEvent`:

```ts
  addAssignment:    (input: Omit<CxDayAssignment, "id">) => CxDayAssignment;
  removeAssignment: (id: string) => void;
```

- [ ] **Step 4: Implement the two functions inside `CxProvider`**

After the existing `addEvent` function body, add:

```ts
  function addAssignment(input: Omit<CxDayAssignment, "id">): CxDayAssignment {
    const assignment: CxDayAssignment = { ...input, id: `cx_asgn_${Date.now()}` };
    dispatch({ type: "ADD_ASSIGNMENT", assignment });
    return assignment;
  }

  function removeAssignment(id: string) {
    dispatch({ type: "REMOVE_ASSIGNMENT", id });
  }
```

- [ ] **Step 5: Add new functions to the context value**

Find the `<CxContext.Provider value={{ ...state, addTask, updateTask, addEvent }}>` line.
Replace with:

```ts
  <CxContext.Provider value={{ ...state, addTask, updateTask, addEvent, addAssignment, removeAssignment }}>
```

- [ ] **Step 6: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/providers/CxProvider.tsx
git commit -m "feat(cx): add addAssignment/removeAssignment mutators to CxProvider"
```

---

## Task 2: Schedule page + TaskInspectorPanel — worker assignment UI

**Files:**
- Modify: `src/app/(shell)/modules/cru/schedule/page.tsx`
- Modify: `src/components/cx/TaskInspectorPanel.tsx`

### Part A — Fix schedule page: live task reference

The schedule page currently stores the full `CxTask` object in state (`useState<CxTask | undefined>`). When `updateTask` modifies CxProvider, the task in state becomes a stale snapshot, so the panel sees old `assignedWorkerIds`. Fix: store only the ID, derive the live task from the `tasks` array.

- [ ] **Step 1: Change `selectedTask` state to ID-based in `SchedulePage`**

In `src/app/(shell)/modules/cru/schedule/page.tsx`, find:
```ts
  const [selectedTask, setSelectedTask] = useState<CxTask | undefined>();
```
Replace with:
```ts
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : undefined;
```

- [ ] **Step 2: Update `openEdit` to use the new state**

Find:
```ts
  function openEdit(task: CxTask) {
    if (!canEdit) return;
    setSelectedTask(task);
    setPanelOpen(true);
  }
```
Replace with:
```ts
  function openEdit(task: CxTask) {
    if (!canEdit) return;
    setSelectedTaskId(task.id);
    setPanelOpen(true);
  }
```

- [ ] **Step 3: Update `handleSave` to use the new state**

Find:
```ts
  function handleSave(data: CreateCxTaskInput) {
    if (selectedTask) {
      updateTask(selectedTask.id, data);
    } else {
      addTask(data);
    }
  }
```
Replace with:
```ts
  function handleSave(data: CreateCxTaskInput) {
    if (selectedTaskId) {
      updateTask(selectedTaskId, data);
    } else {
      addTask(data);
    }
  }
```

- [ ] **Step 4: Update `onClose` to clear ID**

Find:
```ts
        onClose={() => setPanelOpen(false)}
```
Replace with:
```ts
        onClose={() => { setPanelOpen(false); setSelectedTaskId(undefined); }}
```

### Part B — TaskInspectorPanel: worker assignment section

- [ ] **Step 5: Add imports to `TaskInspectorPanel`**

In `src/components/cx/TaskInspectorPanel.tsx`, add these imports after the existing imports:

```ts
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import { UserMinus } from "lucide-react";
```

Note: `Plus` and `Trash2` are already imported. `UserMinus` is the new one.

- [ ] **Step 6: Add hooks and `canAssign` inside the component function**

Inside `TaskInspectorPanel`, after the existing `const isEdit = !!task;` line, add:

```ts
  const { workers, role } = useOrg();
  const { updateTask } = useCx();

  const canAssign = isEdit && role !== "foreman" && role !== "mechanic";

  const assignedWorkerIds = task?.assignedWorkerIds ?? [];
  const projectRoster = workers.filter((w) => w.projectId === projectId);

  function toggleWorker(workerId: string) {
    if (!task) return;
    const current = task.assignedWorkerIds;
    const next = current.includes(workerId)
      ? current.filter((id) => id !== workerId)
      : [...current, workerId];
    updateTask(task.id, { assignedWorkerIds: next });
  }
```

- [ ] **Step 7: Add "Assigned Workers" section in edit mode**

In the JSX, find the `sectionClass` div for "Notes" (it has `<label className={labelClass}>Notes</label>`). Insert the following block **immediately before** that Notes div:

```tsx
      {isEdit && (
        <div className={sectionClass}>
          <div className="flex items-center justify-between mb-2">
            <label className={labelClass} style={{ marginBottom: 0 }}>
              Assigned Workers · {assignedWorkerIds.length}
            </label>
          </div>

          {assignedWorkerIds.length === 0 && (
            <p className="text-xs text-content-muted italic mb-2">No workers assigned yet.</p>
          )}

          {assignedWorkerIds.map((id) => {
            const w = workers.find((x) => x.id === id);
            if (!w) return null;
            return (
              <div
                key={id}
                className="flex items-center justify-between py-2 border-b border-surface-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-content-primary">{w.name}</p>
                  <p className="text-xs text-content-muted capitalize">{w.role}</p>
                </div>
                {canAssign && (
                  <button
                    onClick={() => toggleWorker(id)}
                    className="p-1 text-content-muted hover:text-status-critical transition-colors"
                    title="Remove from task"
                  >
                    <UserMinus size={14} />
                  </button>
                )}
              </div>
            );
          })}

          {canAssign && projectRoster.filter((w) => !assignedWorkerIds.includes(w.id)).length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mt-3 mb-1">
                Add from Roster
              </p>
              {projectRoster
                .filter((w) => !assignedWorkerIds.includes(w.id))
                .map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between py-2 border-b border-surface-border last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-content-primary">{w.name}</p>
                      <p className="text-xs text-content-muted capitalize">{w.role}</p>
                    </div>
                    <button
                      onClick={() => toggleWorker(w.id)}
                      className="p-1 text-content-muted hover:text-gold transition-colors"
                      title="Add to task"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                ))}
            </>
          )}
        </div>
      )}
```

- [ ] **Step 8: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/\(shell\)/modules/cru/schedule/page.tsx src/components/cx/TaskInspectorPanel.tsx
git commit -m "feat(cx): add worker assignment UI to task inspector panel"
```

---

## Task 3: Interactive assignments grid

**Files:**
- Modify: `src/app/(shell)/modules/cru/assignments/page.tsx`

### Background

The current grid:
- `getWeekDates` uses `toISOString().split("T")[0]` — UTC offset bug (fix with `localDateString`)
- `today` uses same UTC pattern — same fix
- `assignmentMap` stores `Record<workerId, Record<date, projectName>>` — no ID stored, so you can't remove assignments
- All cells are static `<td>` elements

### Changes

1. Fix UTC date bug: import `localDateString`, rewrite `getWeekDates`, fix `today`
2. Build `assignmentDetailMap` — stores `{ id, projectName, isThisProject }` per worker/date (needed for removal)
3. Add `canEdit` role check — only superintendent/PM/owner/admin can write assignments
4. Make empty cells clickable (calls `addAssignment`) and this-project cells clickable (calls `removeAssignment`)
5. Other-project cells remain read-only (dimmed, cursor-default)

- [ ] **Step 1: Add imports**

At the top of `src/app/(shell)/modules/cru/assignments/page.tsx`, add:

```ts
import { useCx } from "@/providers/CxProvider";
import { localDateString } from "@/lib/utils/time";
```

The `useCx` import goes after the existing `import { useOrg }` line.
The `localDateString` import goes after the existing imports.

- [ ] **Step 2: Fix `getWeekDates` to use local dates**

Replace the existing `getWeekDates` function with:

```ts
function getWeekDates(anchor: Date): string[] {
  const day    = anchor.getDay();
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return localDateString(d);
  });
}
```

- [ ] **Step 3: Update component to use new hooks and fix `today`**

Inside `AssignmentsPage`, change:

```ts
  const { workers, projects, currentProject } = useOrg();
  const { assignments } = useCx();
```

to:

```ts
  const { workers, projects, currentProject, role } = useOrg();
  const { assignments, addAssignment, removeAssignment } = useCx();
```

And change:

```ts
  const today = new Date().toISOString().split("T")[0];
```

to:

```ts
  const today = localDateString();
  const canEdit = role === "superintendent" || role === "project_engineer" || role === "pm" || role === "owner" || role === "admin";
```

- [ ] **Step 4: Replace `assignmentMap` with `assignmentDetailMap`**

Remove the existing `assignmentMap` useMemo. Replace it with:

```ts
  const assignmentDetailMap = useMemo(() => {
    const map: Record<string, Record<string, { id: string; projectName: string; isThisProject: boolean }>> = {};
    for (const a of assignments) {
      if (!weekDates.includes(a.date)) continue;
      if (!map[a.workerId]) map[a.workerId] = {};
      const project = projects.find((p) => p.id === a.projectId);
      map[a.workerId][a.date] = {
        id:            a.id,
        projectName:   project?.name ?? a.projectId,
        isThisProject: a.projectId === currentProject.id,
      };
    }
    return map;
  }, [assignments, weekDates, projects, currentProject.id]);
```

- [ ] **Step 5: Replace static cells with interactive cells**

In the JSX, find the `{weekDates.map((date) => {` block inside the tbody row. Replace the entire `return (` for each date cell with:

```tsx
                  return (
                    <td key={date} className={`text-center py-2 px-1 ${date === today ? "bg-gold/5" : ""}`}>
                      {(() => {
                        const detail = assignmentDetailMap[worker.id]?.[date];
                        if (detail) {
                          if (detail.isThisProject && canEdit) {
                            return (
                              <button
                                onClick={() => removeAssignment(detail.id)}
                                className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded truncate max-w-[80px] text-gold bg-gold/10 border border-gold/20 hover:border-red-400/40 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                                title={`Remove ${worker.name} from ${detail.projectName} on ${date}`}
                              >
                                {detail.projectName.split(" ")[0]}
                              </button>
                            );
                          }
                          return (
                            <span
                              className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded truncate max-w-[80px] cursor-default ${
                                detail.isThisProject
                                  ? "text-gold bg-gold/10 border border-gold/20"
                                  : "text-content-muted bg-surface-overlay border border-surface-border"
                              }`}
                              title={detail.projectName}
                            >
                              {detail.projectName.split(" ")[0]}
                            </span>
                          );
                        }
                        if (canEdit) {
                          return (
                            <button
                              onClick={() => addAssignment({ workerId: worker.id, projectId: currentProject.id, date })}
                              className="w-full h-6 flex items-center justify-center text-content-muted opacity-0 hover:opacity-100 hover:text-gold transition-all"
                              title={`Assign ${worker.name} to ${currentProject.name} on ${date}`}
                            >
                              <Plus size={11} />
                            </button>
                          );
                        }
                        return <span className="text-content-muted text-[10px]">—</span>;
                      })()}
                    </td>
                  );
```

- [ ] **Step 6: Add `Plus` to the imports from lucide-react**

Find the lucide-react import line at the top:
```ts
import { ArrowLeft } from "lucide-react";
```
Replace with:
```ts
import { ArrowLeft, Plus } from "lucide-react";
```

- [ ] **Step 7: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(shell\)/modules/cru/assignments/page.tsx
git commit -m "feat(cx): interactive assignments grid with add/remove day-level assignments"
```

---

## Self-Review Checklist

### Spec coverage
- [x] `addAssignment` / `removeAssignment` mutators — Task 1
- [x] Worker-to-task assignment UI with add/remove toggles — Task 2 Part B
- [x] Live task prop (no stale snapshot when workers are toggled) — Task 2 Part A
- [x] Interactive grid: empty cell → add, this-project cell → remove — Task 3
- [x] Role gating: foreman/mechanic are read-only — Task 2 Step 6, Task 3 Step 3
- [x] UTC date bug fixed — Task 3 Step 2

### Placeholder scan
- No TBD, no "add validation", no "similar to Task N" — all code is complete

### Type consistency
- `CxDayAssignment` used in Task 1 and Task 3 — same type from `src/lib/cx/types.ts`
- `assignedWorkerIds: string[]` in `CxTask` — `toggleWorker` in Task 2 uses `task.assignedWorkerIds`
- `removeAssignment(id: string)` — Task 3 calls `removeAssignment(detail.id)` where `detail.id` is the assignment's `id` string ✓
- `addAssignment({ workerId, projectId, date })` — matches `Omit<CxDayAssignment, "id">` ✓
