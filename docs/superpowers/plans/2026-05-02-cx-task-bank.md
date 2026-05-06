# CX Task Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Task Bank to the CRU module — a backlog of draft (unscheduled) tasks that can be created manually or imported from a CSV, then promoted to the schedule by assigning dates.

**Architecture:** `CxTask.startDate` and `endDate` become optional — a task without dates is a draft. A new Task Bank page (`/modules/cru/task-bank`) lists all project tasks (both drafts and scheduled), hosts the CSV import flow, and reuses the existing `TaskInspectorPanel` side drawer for view/edit. CSV parsing is pure client-side JS — no library dependency.

**Tech Stack:** Next.js 15 App Router, React, TypeScript strict, existing `InspectorPanel` + `CxProvider` patterns

---

## Codebase Context (read before starting)

**Key files:**
- `src/lib/cx/types.ts` — `CxTask`, `CreateCxTaskInput`, `CxTaskType`, `CxTaskStatus` type definitions
- `src/lib/cx/mock-data.ts` — `MOCK_CX_TASKS` — all tasks have `startDate`/`endDate` today
- `src/providers/CxProvider.tsx` — `useReducer` provider; `addTask(input)`, `updateTask(id, patch)` are the write API
- `src/components/cx/TaskInspectorPanel.tsx` — right-side drawer for create/edit tasks; currently requires dates to enable Save button
- `src/app/(shell)/modules/cru/schedule/page.tsx` — Gantt view filters `status !== "complete"` but does NOT filter out drafts yet; needs to exclude tasks with no `startDate`
- `src/app/(shell)/modules/cru/page.tsx` — CRU module index with feature cards

**Established patterns:**
- `InspectorPanel` from `src/components/ui/InspectorPanel.tsx` — slide-over drawer, `open`/`onClose`/`title`/`subtitle` props
- `PageContainer` from `src/components/ui/PageContainer.tsx` — standard page wrapper
- `SectionHeader` from `src/components/ui/SectionHeader.tsx` — title + subtitle + optional `action` slot
- Role gate: `canEdit = role === "project_engineer" || role === "superintendent" || role === "owner" || role === "admin"`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/cx/types.ts` | Modify | Make `startDate`/`endDate` optional; add `externalId?` field |
| `src/lib/cx/csv-import.ts` | Create | Pure CSV parsing + column mapping logic (no React) |
| `src/providers/CxProvider.tsx` | Modify | Add `ADD_TASKS` bulk action and `addTasks` function |
| `src/components/cx/TaskInspectorPanel.tsx` | Modify | Allow save without dates (draft mode); update button label |
| `src/components/cx/CsvImportModal.tsx` | Create | 3-step modal: upload → map columns → preview + confirm |
| `src/app/(shell)/modules/cru/task-bank/page.tsx` | Create | Task Bank page: table of all tasks + import + new draft |
| `src/app/(shell)/modules/cru/schedule/page.tsx` | Modify | Filter drafts (no startDate) out of Gantt/Calendar |
| `src/app/(shell)/modules/cru/page.tsx` | Modify | Add Task Bank feature card to CRU index |

---

## Build Verification

No test suite. Use `npm run build` as the gate:
```bash
npm run build 2>&1 | tail -5
```
Expected: clean route table, no TypeScript errors.

---

## Task 1: Type changes — optional dates, externalId, bulk action

**Files:**
- Modify: `src/lib/cx/types.ts`
- Modify: `src/providers/CxProvider.tsx`

### Part A — types.ts

- [ ] **Step 1: Make `startDate` and `endDate` optional on `CxTask` and `CreateCxTaskInput`, add `externalId`**

In `src/lib/cx/types.ts`, change:

```ts
export type CxTaskType =
  | "pour"
  | "inspection"
  | "delivery"
  | "grading"
  | "concrete"
  | "framing"
  | "electrical"
  | "excavation"
  | "utility"
  | "paving"
  | "demolition"
  | "other";

export type CxTaskStatus =
  | "not_started"
  | "in_progress"
  | "on_hold"
  | "complete";

export type CxEventType =
  | "pour"
  | "inspection"
  | "delivery"
  | "grading"
  | "milestone"
  | "other";

export type CxStaffingStatus = "understaffed" | "staffed" | "overstaffed";

export interface CxCrewRequirement {
  role: WorkerRole;
  count: number;
}

export interface CxTask {
  id:                 string;
  projectId:          string;
  name:               string;
  type:               CxTaskType;
  startDate?:         string;   // YYYY-MM-DD — undefined = draft
  endDate?:           string;   // YYYY-MM-DD — undefined = draft
  location?:          string;
  status:             CxTaskStatus;
  crewRequirements:   CxCrewRequirement[];
  assignedWorkerIds:  string[];
  notes?:             string;
  externalId?:        string;   // ID from imported spreadsheet
}

export interface CxEvent {
  id:         string;
  projectId:  string;
  name:       string;
  type:       CxEventType;
  date:       string;   // YYYY-MM-DD
  time?:      string;   // HH:MM
  location?:  string;
  notes?:     string;
}

export interface CxDayAssignment {
  id:         string;
  workerId:   string;
  projectId:  string;
  date:       string;   // YYYY-MM-DD
}

export interface CreateCxTaskInput {
  projectId:          string;
  name:               string;
  type:               CxTaskType;
  startDate?:         string;
  endDate?:           string;
  location?:          string;
  status:             CxTaskStatus;
  crewRequirements:   CxCrewRequirement[];
  assignedWorkerIds:  string[];
  notes?:             string;
  externalId?:        string;
}
```

Replace the entire contents of the file with the above (keeping the `import type { WorkerRole }` at the top).

### Part B — CxProvider.tsx

- [ ] **Step 2: Add `ADD_TASKS` bulk action to the reducer**

In `src/providers/CxProvider.tsx`, add to the `CxAction` union:
```ts
| { type: "ADD_TASKS"; tasks: CxTask[] }
```

Add the case to `cxReducer`:
```ts
case "ADD_TASKS":
  return { ...state, tasks: [...state.tasks, ...action.tasks] };
```

- [ ] **Step 3: Add `addTasks` to the context interface and provider**

Add to `CxContextValue` interface:
```ts
addTasks: (inputs: CreateCxTaskInput[]) => CxTask[];
```

Add the function inside `CxProvider`:
```ts
function addTasks(inputs: CreateCxTaskInput[]): CxTask[] {
  const tasks: CxTask[] = inputs.map((input) => ({
    ...input,
    id: `cx_task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  }));
  dispatch({ type: "ADD_TASKS", tasks });
  return tasks;
}
```

Add `addTasks` to the Provider value:
```ts
<CxContext.Provider value={{ ...state, addTask, addTasks, updateTask, addEvent, addAssignment, removeAssignment }}>
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: clean build. TypeScript will flag any places that assume `startDate`/`endDate` are non-optional — fix those in subsequent tasks.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cx/types.ts src/providers/CxProvider.tsx
git commit -m "feat(cx): make task dates optional for draft support, add bulk addTasks"
```

---

## Task 2: Fix schedule page — filter drafts from Gantt

**Files:**
- Modify: `src/app/(shell)/modules/cru/schedule/page.tsx`

The Gantt currently filters `status !== "complete"`. Draft tasks (no `startDate`) would crash the Gantt bar logic since `date >= task.startDate` with `undefined` is always false but TypeScript now requires a guard.

- [ ] **Step 1: Update `GanttView` to exclude draft tasks**

In `GanttView`, change the `projectTasks` line from:
```ts
const projectTasks = tasks.filter((t) => t.projectId === projectId && t.status !== "complete");
```
to:
```ts
const projectTasks = tasks.filter(
  (t) => t.projectId === projectId && t.status !== "complete" && !!t.startDate && !!t.endDate,
);
```

- [ ] **Step 2: Fix `handleSave` — `updateTask` needs date fields as optional**

`updateTask(selectedTaskId, data)` passes `CreateCxTaskInput` which now has optional dates. `updateTask` takes `Partial<CxTask>` so this is fine — verify TypeScript accepts it with no cast needed.

- [ ] **Step 3: Update empty-state message in GanttView**

Change:
```tsx
<p className="text-sm text-content-muted py-8 text-center">
  No active tasks. Create one to see it on the Gantt.
</p>
```
to:
```tsx
<p className="text-sm text-content-muted py-8 text-center">
  No scheduled tasks. Add dates to tasks in the Task Bank to see them here.
</p>
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(shell\)/modules/cru/schedule/page.tsx
git commit -m "fix(cx): exclude draft tasks (no dates) from Gantt view"
```

---

## Task 3: TaskInspectorPanel — draft mode

**Files:**
- Modify: `src/components/cx/TaskInspectorPanel.tsx`

Currently the Save button is disabled without `startDate` and `endDate`. We need to allow saving as a draft (no dates), and show a different button label accordingly.

- [ ] **Step 1: Update `FormState` and `getInitialState` for optional dates**

In `src/components/cx/TaskInspectorPanel.tsx`:

Change `FormState`:
```ts
interface FormState {
  name:      string;
  type:      CxTaskType;
  startDate: string;
  endDate:   string;
  location:  string;
  status:    CxTaskStatus;
  notes:     string;
  externalId: string;
  reqs:      CxCrewRequirement[];
}
```

Update `getInitialState` to include `externalId`:
```ts
function getInitialState(task?: CxTask): FormState {
  if (task) {
    return {
      name:       task.name,
      type:       task.type,
      startDate:  task.startDate ?? "",
      endDate:    task.endDate ?? "",
      location:   task.location ?? "",
      status:     task.status,
      notes:      task.notes ?? "",
      externalId: task.externalId ?? "",
      reqs:       task.crewRequirements,
    };
  }
  return {
    name: "", type: "pour", startDate: "", endDate: "",
    location: "", status: "not_started", notes: "", externalId: "", reqs: [],
  };
}
```

- [ ] **Step 2: Add `externalId` state setter and destructure**

After the existing setters, add:
```ts
const setExternalId = (val: string) => setFormState((prev) => ({ ...prev, externalId: val }));
```

Destructure from formState:
```ts
const { name, type, startDate, endDate, location, status, notes, externalId, reqs } = formState;
```

- [ ] **Step 3: Add `externalId` to `handleSave`**

Update `handleSave`:
```ts
function handleSave() {
  if (!name.trim()) return;
  onSave({
    projectId,
    name:              name.trim(),
    type,
    startDate:         startDate || undefined,
    endDate:           endDate || undefined,
    location:          location.trim() || undefined,
    status,
    crewRequirements:  reqs,
    assignedWorkerIds: task?.assignedWorkerIds ?? [],
    notes:             notes.trim() || undefined,
    externalId:        externalId.trim() || undefined,
  });
  onClose();
}
```

- [ ] **Step 4: Add External ID field to the form**

Add after the Location section and before the Crew Requirements section:
```tsx
<div className={sectionClass}>
  <label className={labelClass}>External Task ID</label>
  <input
    className={fieldClass}
    placeholder="e.g. TK-001 (from spreadsheet)"
    value={externalId}
    onChange={(e) => setExternalId(e.target.value)}
  />
</div>
```

- [ ] **Step 5: Update Save button — allow save without dates, dynamic label**

The button currently has `disabled={!name.trim() || !startDate || !endDate}`. Change to only require `name`:

```tsx
const isDraft = !startDate || !endDate;
const saveLabel = isEdit
  ? (isDraft ? "Save Draft" : "Save Changes")
  : (isDraft ? "Create Draft" : "Schedule Task");

<button
  onClick={handleSave}
  disabled={!name.trim()}
  className="w-full py-2.5 rounded-lg bg-gold hover:bg-gold/90 text-black text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
>
  {saveLabel}
</button>
```

- [ ] **Step 6: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 7: Commit**

```bash
git add src/components/cx/TaskInspectorPanel.tsx
git commit -m "feat(cx): allow saving tasks as drafts (no dates required), add external ID field"
```

---

## Task 4: CSV parsing utility

**Files:**
- Create: `src/lib/cx/csv-import.ts`

Pure TypeScript — no React, no imports from the app. This makes it easy to test mentally and reuse.

- [ ] **Step 1: Create `src/lib/cx/csv-import.ts`**

```ts
import type { CreateCxTaskInput, CxTaskType, CxTaskStatus } from "./types";

export interface ColumnMapping {
  name:        number | null;   // CSV column index → task field
  type:        number | null;
  startDate:   number | null;
  endDate:     number | null;
  location:    number | null;
  status:      number | null;
  notes:       number | null;
  externalId:  number | null;
}

export const EMPTY_MAPPING: ColumnMapping = {
  name: null, type: null, startDate: null, endDate: null,
  location: null, status: null, notes: null, externalId: null,
};

export const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  name:       "Task Name",
  type:       "Type",
  startDate:  "Start Date",
  endDate:    "End Date",
  location:   "Location",
  status:     "Status",
  notes:      "Notes",
  externalId: "Task ID",
};

const TASK_TYPE_VALUES = new Set<CxTaskType>([
  "pour", "inspection", "delivery", "grading", "concrete", "framing",
  "electrical", "excavation", "utility", "paving", "demolition", "other",
]);

const STATUS_VALUES = new Set<CxTaskStatus>([
  "not_started", "in_progress", "on_hold", "complete",
]);

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSVText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows    = lines.slice(1).map(parseCSVLine);
  return { headers, rows };
}

// Auto-detect column mapping from header names (fuzzy, case-insensitive)
export function detectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { ...EMPTY_MAPPING };
  const patterns: Record<keyof ColumnMapping, RegExp> = {
    name:       /name|task.?name|description|title/i,
    type:       /type|task.?type|work.?type|category/i,
    startDate:  /start.?date|start|begin|from/i,
    endDate:    /end.?date|end|finish|to/i,
    location:   /location|loc|area|zone|grid/i,
    status:     /status/i,
    notes:      /notes?|comments?|remarks?/i,
    externalId: /task.?id|id|ref|reference|ext/i,
  };
  headers.forEach((h, i) => {
    (Object.keys(patterns) as Array<keyof ColumnMapping>).forEach((field) => {
      if (mapping[field] === null && patterns[field].test(h)) {
        mapping[field] = i;
      }
    });
  });
  return mapping;
}

function coerceType(raw: string): CxTaskType {
  const normalized = raw.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (TASK_TYPE_VALUES.has(normalized as CxTaskType)) return normalized as CxTaskType;
  const typeMap: Record<string, CxTaskType> = {
    concrete_work: "concrete",
    utility_work:  "utility",
    site_work:     "grading",
    demo:          "demolition",
    elec:          "electrical",
  };
  return typeMap[normalized] ?? "other";
}

function coerceStatus(raw: string): CxTaskStatus {
  const normalized = raw.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (STATUS_VALUES.has(normalized as CxTaskStatus)) return normalized as CxTaskStatus;
  const statusMap: Record<string, CxTaskStatus> = {
    "not started":   "not_started",
    "in progress":   "in_progress",
    "on hold":       "on_hold",
    scheduled:       "not_started",
    pending:         "not_started",
    active:          "in_progress",
    done:            "complete",
    completed:       "complete",
  };
  return statusMap[normalized] ?? "not_started";
}

function coerceDate(raw: string): string | undefined {
  if (!raw) return undefined;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // MM/DD/YYYY or M/D/YYYY
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return undefined;
}

export function mapRowsToTasks(
  rows:      string[][],
  mapping:   ColumnMapping,
  projectId: string,
): CreateCxTaskInput[] {
  return rows
    .filter((row) => {
      const nameIdx = mapping.name;
      return nameIdx !== null && row[nameIdx]?.trim();
    })
    .map((row) => {
      const get = (idx: number | null) => (idx !== null ? (row[idx] ?? "") : "");
      return {
        projectId,
        name:              get(mapping.name).trim(),
        type:              mapping.type   !== null ? coerceType(get(mapping.type))     : "other",
        startDate:         coerceDate(get(mapping.startDate)),
        endDate:           coerceDate(get(mapping.endDate)),
        location:          get(mapping.location).trim()   || undefined,
        status:            mapping.status !== null ? coerceStatus(get(mapping.status)) : "not_started",
        notes:             get(mapping.notes).trim()      || undefined,
        externalId:        get(mapping.externalId).trim() || undefined,
        crewRequirements:  [],
        assignedWorkerIds: [],
      };
    });
}

export const CSV_TEMPLATE_HEADER =
  "task_id,name,type,start_date,end_date,location,status,notes";

export const CSV_TEMPLATE_EXAMPLE =
  `${CSV_TEMPLATE_HEADER}\nTK-001,North Wall Pour,pour,2026-05-15,2026-05-15,Grid B-4,not_started,\nTK-002,Foundation Inspection,inspection,,,South Wing,not_started,\nTK-003,Utility Trenching,utility,2026-05-20,2026-05-24,Zone C,,Coordinate with city inspector`;
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/cx/csv-import.ts
git commit -m "feat(cx): add CSV parsing utility for task import"
```

---

## Task 5: CSV Import Modal

**Files:**
- Create: `src/components/cx/CsvImportModal.tsx`

3-step modal: **Upload** → **Map Columns** → **Preview + Confirm**. Uses a simple `<dialog>`-style overlay (same visual pattern as `InspectorPanel` but centered).

- [ ] **Step 1: Create `src/components/cx/CsvImportModal.tsx`**

```tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { X, Upload, Download, ChevronRight, ChevronLeft, Check } from "lucide-react";
import {
  parseCSVText,
  detectMapping,
  mapRowsToTasks,
  FIELD_LABELS,
  CSV_TEMPLATE_EXAMPLE,
  type ColumnMapping,
} from "@/lib/cx/csv-import";
import type { CreateCxTaskInput } from "@/lib/cx/types";

type Step = "upload" | "map" | "preview";

interface CsvImportModalProps {
  open:      boolean;
  onClose:   () => void;
  projectId: string;
  onImport:  (tasks: CreateCxTaskInput[]) => void;
}

const FIELD_ORDER: Array<keyof ColumnMapping> = [
  "name", "externalId", "type", "startDate", "endDate", "location", "status", "notes",
];

export function CsvImportModal({ open, onClose, projectId, onImport }: CsvImportModalProps) {
  const [step,     setStep]     = useState<Step>("upload");
  const [headers,  setHeaders]  = useState<string[]>([]);
  const [rows,     setRows]     = useState<string[][]>([]);
  const [mapping,  setMapping]  = useState<ColumnMapping>({
    name: null, type: null, startDate: null, endDate: null,
    location: null, status: null, notes: null, externalId: null,
  });
  const [preview,  setPreview]  = useState<CreateCxTaskInput[]>([]);
  const [error,    setError]    = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setHeaders([]); setRows([]); setPreview([]); setError(null);
    setMapping({ name: null, type: null, startDate: null, endDate: null,
      location: null, status: null, notes: null, externalId: null });
  }

  function handleClose() { reset(); onClose(); }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE_EXAMPLE], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "task-import-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const handleFile = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSVText(text);
      if (h.length === 0) { setError("File appears to be empty."); return; }
      setHeaders(h);
      setRows(r);
      setMapping(detectMapping(h));
      setStep("map");
    };
    reader.readAsText(file);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
    else setError("Please drop a .csv file.");
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function goToPreview() {
    if (mapping.name === null) { setError("You must map the Task Name column."); return; }
    setError(null);
    setPreview(mapRowsToTasks(rows, mapping, projectId));
    setStep("preview");
  }

  function handleConfirm() {
    onImport(preview);
    handleClose();
  }

  if (!open) return null;

  const fieldClass  = "w-full bg-surface-overlay border border-surface-border rounded px-2 py-1.5 text-xs text-content-primary focus:outline-none focus:border-gold/50";
  const labelClass  = "block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} aria-hidden />
      <div className="relative z-10 w-full max-w-xl bg-surface-raised border border-surface-border rounded-xl shadow-2xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border flex-shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-0.5">
              {step === "upload" ? "Step 1 of 3" : step === "map" ? "Step 2 of 3" : "Step 3 of 3"}
            </p>
            <h2 className="text-sm font-bold text-content-primary">
              {step === "upload" ? "Import Tasks · Upload CSV" : step === "map" ? "Map Columns" : "Preview & Confirm"}
            </h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded hover:bg-surface-overlay text-content-muted hover:text-content-primary transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-xs text-content-secondary leading-relaxed">
                Upload a CSV file exported from your scheduling spreadsheet. Each row becomes a task.
                Tasks without dates will be saved as drafts.
              </p>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-2">Expected Columns</p>
                <div className="bg-surface-overlay rounded-lg border border-surface-border px-3 py-2 font-mono text-[10px] text-content-muted">
                  task_id, name, type, start_date, end_date, location, status, notes
                </div>
                <p className="text-[10px] text-content-muted mt-1.5">
                  Column order doesn&apos;t matter — you&apos;ll map them in the next step.
                </p>
              </div>

              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80 transition-colors font-semibold"
              >
                <Download size={13} /> Download Template CSV
              </button>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-surface-border hover:border-gold/40 rounded-xl py-10 flex flex-col items-center gap-2 cursor-pointer transition-colors"
              >
                <Upload size={20} className="text-content-muted" />
                <p className="text-sm font-semibold text-content-primary">Drop CSV here or click to browse</p>
                <p className="text-xs text-content-muted">.csv files only</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />

              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}

          {/* Step 2: Map Columns */}
          {step === "map" && (
            <div className="space-y-4">
              <p className="text-xs text-content-secondary">
                Detected <span className="font-semibold text-content-primary">{rows.length}</span> rows.
                Match your CSV columns to task fields below. Unneeded fields can be left as &ldquo;Skip&rdquo;.
              </p>

              <div className="space-y-3">
                {FIELD_ORDER.map((field) => (
                  <div key={field}>
                    <label className={labelClass}>
                      {FIELD_LABELS[field]}
                      {field === "name" && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <select
                      className={fieldClass}
                      value={mapping[field] ?? ""}
                      onChange={(e) => setMapping((prev) => ({
                        ...prev,
                        [field]: e.target.value === "" ? null : Number(e.target.value),
                      }))}
                    >
                      <option value="">— Skip —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && (
            <div className="space-y-3">
              <p className="text-xs text-content-secondary">
                <span className="font-semibold text-content-primary">{preview.length}</span> tasks ready to import.
                Tasks without dates will be saved as drafts.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2 pr-3">Name</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2 pr-3">Type</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2 pr-3">Dates</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((t, i) => (
                      <tr key={i} className="border-b border-surface-border last:border-0">
                        <td className="py-2 pr-3 font-medium text-content-primary">{t.name}</td>
                        <td className="py-2 pr-3 text-content-muted capitalize">{t.type}</td>
                        <td className="py-2 pr-3">
                          {t.startDate
                            ? <span className="text-content-primary">{t.startDate} → {t.endDate}</span>
                            : <span className="text-amber-400 font-semibold">Draft</span>
                          }
                        </td>
                        <td className="py-2 text-content-muted">{t.externalId ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-surface-border flex-shrink-0">
          {step !== "upload" ? (
            <button
              onClick={() => setStep(step === "preview" ? "map" : "upload")}
              className="flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors font-semibold"
            >
              <ChevronLeft size={13} /> Back
            </button>
          ) : <div />}

          {step === "upload" && (
            <p className="text-[10px] text-content-muted">Select a file to continue</p>
          )}
          {step === "map" && (
            <button
              onClick={goToPreview}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
            >
              Preview <ChevronRight size={13} />
            </button>
          )}
          {step === "preview" && (
            <button
              onClick={handleConfirm}
              disabled={preview.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Check size={13} /> Import {preview.length} Task{preview.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/components/cx/CsvImportModal.tsx
git commit -m "feat(cx): add CSV import modal with 3-step upload/map/preview flow"
```

---

## Task 6: Task Bank page

**Files:**
- Create: `src/app/(shell)/modules/cru/task-bank/page.tsx`

Shows all tasks for the current project (drafts + scheduled) in a table. Draft tasks have an amber "Draft" badge. Clicking a row opens the `TaskInspectorPanel`. Header has "Import CSV" and "+ New Draft" buttons.

- [ ] **Step 1: Create `src/app/(shell)/modules/cru/task-bank/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TaskInspectorPanel } from "@/components/cx/TaskInspectorPanel";
import { CsvImportModal } from "@/components/cx/CsvImportModal";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import type { CxTask, CreateCxTaskInput } from "@/lib/cx/types";
import { ArrowLeft, Plus, Upload } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  on_hold:     "On Hold",
  complete:    "Complete",
};

const TYPE_LABEL: Record<string, string> = {
  pour: "Pour", inspection: "Inspection", delivery: "Delivery",
  grading: "Grading", concrete: "Concrete Work", framing: "Framing",
  electrical: "Electrical", excavation: "Excavation", utility: "Utility Work",
  paving: "Paving", demolition: "Demolition", other: "Other",
};

export default function TaskBankPage() {
  const { currentProject, role } = useOrg();
  const { tasks, addTask, addTasks, updateTask } = useCx();

  const [panelOpen,    setPanelOpen]    = useState(false);
  const [importOpen,   setImportOpen]   = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : undefined;

  const projectTasks = tasks
    .filter((t) => t.projectId === currentProject.id)
    .sort((a, b) => {
      // Drafts first, then by startDate
      if (!a.startDate && b.startDate)  return -1;
      if (a.startDate  && !b.startDate) return 1;
      if (a.startDate  && b.startDate)  return a.startDate.localeCompare(b.startDate);
      return a.name.localeCompare(b.name);
    });

  const canEdit = role === "project_engineer" || role === "superintendent" || role === "owner" || role === "admin";

  function openCreate() {
    setSelectedTaskId(undefined);
    setPanelOpen(true);
  }

  function openEdit(task: CxTask) {
    setSelectedTaskId(task.id);
    setPanelOpen(true);
  }

  function handleSave(data: CreateCxTaskInput) {
    if (selectedTaskId) {
      updateTask(selectedTaskId, data);
    } else {
      addTask(data);
    }
  }

  function handleImport(inputs: CreateCxTaskInput[]) {
    addTasks(inputs);
  }

  const draftCount     = projectTasks.filter((t) => !t.startDate).length;
  const scheduledCount = projectTasks.filter((t) =>  t.startDate).length;

  return (
    <PageContainer maxWidth="wide">
      <div className="mb-4">
        <Link href="/modules/cru" className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors">
          <ArrowLeft size={12} /> CX
        </Link>
      </div>

      <SectionHeader
        title="Task Bank"
        subtitle={`${currentProject.name} · ${scheduledCount} scheduled · ${draftCount} draft${draftCount !== 1 ? "s" : ""}`}
        action={
          canEdit ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-surface-border text-content-secondary hover:text-content-primary hover:border-gold/40 rounded transition-colors"
              >
                <Upload size={13} /> Import CSV
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
              >
                <Plus size={13} /> New Draft
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="mt-4">
        {projectTasks.length === 0 ? (
          <p className="text-sm text-content-muted py-12 text-center">
            No tasks yet. Import a CSV or create a draft to get started.
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2 pr-4">Task</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2 pr-4">Type</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2 pr-4">Dates</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2 pr-4">Status</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2">ID</th>
              </tr>
            </thead>
            <tbody>
              {projectTasks.map((task) => {
                const isDraft = !task.startDate;
                return (
                  <tr
                    key={task.id}
                    onClick={() => openEdit(task)}
                    className="border-b border-surface-border hover:bg-surface-raised/50 cursor-pointer group"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-content-primary group-hover:text-gold transition-colors">
                          {task.name}
                        </p>
                        {isDraft && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400">
                            Draft
                          </span>
                        )}
                      </div>
                      {task.location && (
                        <p className="text-[10px] text-content-muted mt-0.5">{task.location}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs text-content-muted">
                      {TYPE_LABEL[task.type] ?? task.type}
                    </td>
                    <td className="py-3 pr-4 text-xs text-content-muted">
                      {task.startDate
                        ? `${task.startDate}${task.endDate !== task.startDate ? ` → ${task.endDate}` : ""}`
                        : <span className="text-content-muted italic">Unscheduled</span>
                      }
                    </td>
                    <td className="py-3 pr-4 text-xs text-content-muted">
                      {STATUS_LABEL[task.status] ?? task.status}
                    </td>
                    <td className="py-3 text-xs text-content-muted font-mono">
                      {task.externalId ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <TaskInspectorPanel
        open={panelOpen}
        onClose={() => { setPanelOpen(false); setSelectedTaskId(undefined); }}
        projectId={currentProject.id}
        task={selectedTask}
        onSave={handleSave}
      />

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        projectId={currentProject.id}
        onImport={handleImport}
      />
    </PageContainer>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(shell\)/modules/cru/task-bank/page.tsx
git commit -m "feat(cx): add Task Bank page with draft/scheduled task table"
```

---

## Task 7: CRU nav — add Task Bank card

**Files:**
- Modify: `src/app/(shell)/modules/cru/page.tsx`

- [ ] **Step 1: Add the Task Bank feature card**

In `src/app/(shell)/modules/cru/page.tsx`, add `BookOpen` to the lucide import and add a new entry to `FEATURES`:

Change the import from:
```ts
import { Users, CalendarDays, Truck, LayoutGrid, HardHat, ArrowUpRight } from "lucide-react";
```
to:
```ts
import { Users, CalendarDays, Truck, LayoutGrid, HardHat, BookOpen, ArrowUpRight } from "lucide-react";
```

Add to the `FEATURES` array (after the Schedule entry, before Equipment):
```ts
{
  icon:  <BookOpen size={16} className="text-gold" />,
  title: "Task Bank",
  desc:  "All project tasks — drafts and scheduled. Import from CSV or create tasks manually.",
  href:  "/modules/cru/task-bank",
  roles: ["all"],
},
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(shell\)/modules/cru/page.tsx
git commit -m "feat(cx): add Task Bank to CRU module nav"
```

---

## Self-Review

### Spec coverage
- [x] Draft tasks (no dates) — Task 1 (optional dates on `CxTask`)
- [x] Task Bank page with draft/scheduled table — Task 6
- [x] CSV import with template download — Task 5 (download in Step 1)
- [x] Column mapping guide — Task 5 (Step 2: map columns screen)
- [x] Preview before import — Task 5 (Step 3: preview table)
- [x] External task ID preserved — Tasks 1, 3, 4, 6 (`externalId` field)
- [x] Gantt excludes drafts — Task 2
- [x] Inspector panel supports draft save — Task 3
- [x] CRU nav updated — Task 7
- [x] Bulk import via `addTasks` — Task 1

### Placeholder scan
None found.

### Type consistency
- `externalId?: string` added to `CxTask`, `CreateCxTaskInput`, `FormState`, `mapRowsToTasks` output — consistent throughout
- `addTasks(inputs: CreateCxTaskInput[]): CxTask[]` matches `CxContextValue` interface declaration
- `CsvImportModal` `onImport: (tasks: CreateCxTaskInput[]) => void` matches `TaskBankPage`'s `handleImport` signature
- `ColumnMapping` keys match `FIELD_LABELS` keys and `FIELD_ORDER` array — all 8 fields covered
