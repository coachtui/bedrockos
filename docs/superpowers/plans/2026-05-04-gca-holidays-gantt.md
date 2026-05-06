# GCA Holidays — Gantt & Schedule Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reflect GCA 2026 holidays and weekends as non-working days on all Gantt charts — columns go gray, task bars skip them — with per-project toggles for days the crew will actually work.

**Architecture:** Holidays live in a hardcoded constant (`src/lib/cx/holidays.ts`). Per-project overrides are stored as a `text[]` column on the `projects` table. The Gantt switches from a flex layout (buggy column widths) to CSS grid, then applies `isNonWorkingDay()` to gray-out columns and break task bars at non-working days.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, Supabase (postgres), TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/cx/holidays.ts` | **Create** | `GCA_HOLIDAYS_2026` constant + `isNonWorkingDay()` utility |
| `supabase/migrations/20260504_projects_working_holidays.sql` | **Create** | Add `working_holiday_dates text[]` to projects table |
| `src/types/domain.ts` | **Modify** | Add `working_holiday_dates` to `Project` + `UpdateProjectInput` |
| `src/lib/supabase/projects.ts` | **Modify** | Select + map `working_holiday_dates` column |
| `src/lib/actions/projects.ts` | **Modify** | Handle `working_holiday_dates` in `serverUpdateProject` |
| `src/components/cx/GanttPanel.tsx` | **Modify** | CSS grid fix + non-working day columns + bar gaps |
| `src/app/(shell)/modules/cru/schedule/page.tsx` | **Modify** | Pass `workingHolidayDates` prop to `GanttPanel` |
| `src/app/(shell)/projects/[projectId]/settings/page.tsx` | **Create** | Server component wrapper for settings route |
| `src/app/(shell)/projects/[projectId]/settings/client.tsx` | **Create** | Holiday toggle UI (uses OrgProvider) |
| `src/app/(shell)/projects/[projectId]/client.tsx` | **Modify** | Add "Settings" link to project command center |

---

## Task 1: Holiday Utility

**Files:**
- Create: `src/lib/cx/holidays.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/cx/holidays.ts

export interface GcaHoliday {
  date: string; // YYYY-MM-DD
  name: string;
}

export const GCA_HOLIDAYS_2026: GcaHoliday[] = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-01-19", name: "Martin Luther King Jr. Day" },
  { date: "2026-02-16", name: "President's Day" },
  { date: "2026-03-26", name: "Prince Jonah Kuhio Day" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-05-25", name: "Memorial Day" },
  { date: "2026-06-11", name: "King Kamehameha I Day" },
  { date: "2026-06-19", name: "Juneteenth" },
  { date: "2026-07-03", name: "Independence Day (observed)" },
  { date: "2026-08-21", name: "Statehood Day" },
  { date: "2026-09-07", name: "Labor Day" },
  { date: "2026-10-12", name: "Columbus Day" },
  { date: "2026-11-03", name: "General Election Day" },
  { date: "2026-11-11", name: "Veterans' Day" },
  { date: "2026-11-26", name: "Thanksgiving Day" },
  { date: "2026-12-25", name: "Christmas Day" },
];

const HOLIDAY_SET = new Set(GCA_HOLIDAYS_2026.map((h) => h.date));

export function isNonWorkingDay(date: string, workingOverrides: string[]): boolean {
  const d = new Date(date + "T12:00:00");
  const dow = d.getDay(); // 0=Sun, 6=Sat
  if (dow === 0 || dow === 6) return true;
  if (!HOLIDAY_SET.has(date)) return false;
  return !workingOverrides.includes(date);
}
```

- [ ] **Step 2: Verify the logic manually**

Run in your head: `isNonWorkingDay("2026-01-01", [])` → `true` (holiday, not overridden).
`isNonWorkingDay("2026-01-01", ["2026-01-01"])` → `false` (overridden to working).
`isNonWorkingDay("2026-01-03", [])` → `true` (Saturday).
`isNonWorkingDay("2026-01-05", [])` → `false` (Monday, not a holiday).

- [ ] **Step 3: Commit**

```bash
git add src/lib/cx/holidays.ts
git commit -m "feat(cx): add GCA 2026 holiday constant and isNonWorkingDay utility"
```

---

## Task 2: Supabase Migration

**Files:**
- Create: `supabase/migrations/20260504_projects_working_holidays.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/20260504_projects_working_holidays.sql
alter table projects
  add column if not exists working_holiday_dates text[] not null default '{}';
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the Supabase MCP tool to apply the migration. After applying, verify the column exists:

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'projects' and column_name = 'working_holiday_dates';
```

Expected output: one row with `column_name = working_holiday_dates`, `data_type = ARRAY`, `column_default = '{}'`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260504_projects_working_holidays.sql
git commit -m "feat(db): add working_holiday_dates column to projects table"
```

---

## Task 3: Extend Project Type, Fetch, and Server Action

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/lib/supabase/projects.ts`
- Modify: `src/lib/actions/projects.ts`

- [ ] **Step 1: Add `working_holiday_dates` to the `Project` interface in `src/types/domain.ts`**

Find the `Project` interface (around line 11) and add the field:

```typescript
export interface Project {
  id:                    string;
  name:                  string;
  slug:                  string;
  status:                ProjectStatus;
  phase:                 string;
  location:              string;
  pm_name:               string;
  progress_pct:          number;
  open_issues:           number;
  last_activity:         string;
  start_date:            string;
  end_date:              string;
  description?:          string;
  award_price?:          number;
  working_holiday_dates: string[];   // ← add this
}
```

- [ ] **Step 2: Add `working_holiday_dates` to `UpdateProjectInput` in `src/types/domain.ts`**

Find the `UpdateProjectInput` type (around line 153) and extend the pick:

```typescript
export type UpdateProjectInput = Partial<Pick<Project,
  "name" | "location" | "phase" | "pm_name" | "status" |
  "start_date" | "end_date" | "description" | "award_price" |
  "working_holiday_dates"
>>;
```

- [ ] **Step 3: Update `fetchOrgProjects` in `src/lib/supabase/projects.ts`**

Add `working_holiday_dates` to the select string and the returned object:

```typescript
export async function fetchOrgProjects(orgId: string): Promise<Project[]> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, slug, status, phase, location, pm_name, progress_pct, open_issues, last_activity, start_date, end_date, description, award_price, working_holiday_dates")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id:                    row.id,
      name:                  row.name,
      slug:                  row.slug,
      status:                toProjectStatus(row.status),
      phase:                 row.phase,
      location:              row.location,
      pm_name:               row.pm_name,
      progress_pct:          row.progress_pct,
      open_issues:           row.open_issues,
      last_activity:         row.last_activity,
      start_date:            row.start_date,
      end_date:              row.end_date,
      description:           row.description ?? undefined,
      award_price:           row.award_price != null ? Number(row.award_price) : undefined,
      working_holiday_dates: Array.isArray(row.working_holiday_dates) ? row.working_holiday_dates : [],
    }));
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Handle `working_holiday_dates` in `serverUpdateProject` in `src/lib/actions/projects.ts`**

In the `serverUpdateProject` function, add one line after the existing `award_price` check:

```typescript
if (patch.working_holiday_dates !== undefined) update.working_holiday_dates = patch.working_holiday_dates;
```

The full updated function body (for reference):

```typescript
export async function serverUpdateProject(
  id: string,
  patch: UpdateProjectInput,
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.name                  !== undefined) update.name                  = patch.name;
  if (patch.location              !== undefined) update.location              = patch.location;
  if (patch.phase                 !== undefined) update.phase                 = patch.phase;
  if (patch.pm_name               !== undefined) update.pm_name               = patch.pm_name;
  if (patch.status                !== undefined) update.status                = patch.status;
  if (patch.start_date            !== undefined) update.start_date            = patch.start_date;
  if (patch.end_date              !== undefined) update.end_date              = patch.end_date;
  if (patch.description           !== undefined) update.description           = patch.description ?? null;
  if (patch.award_price           !== undefined) update.award_price           = patch.award_price ?? null;
  if (patch.working_holiday_dates !== undefined) update.working_holiday_dates = patch.working_holiday_dates;
  if (Object.keys(update).length === 0) return;
  await supabase.from("projects").update(update).eq("id", id);
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/tui/bedrockos && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `working_holiday_dates`.

- [ ] **Step 6: Commit**

```bash
git add src/types/domain.ts src/lib/supabase/projects.ts src/lib/actions/projects.ts
git commit -m "feat(types): add working_holiday_dates to Project type, fetch, and server action"
```

---

## Task 4: Rebuild GanttPanel — Column Width Fix + Non-Working Days

**Files:**
- Modify: `src/components/cx/GanttPanel.tsx`

The full file is 116 lines. Replace it entirely with the version below. Key changes:
1. CSS grid replaces flex (column width bug fix)
2. New `workingHolidayDates?: string[]` prop
3. Non-working columns are gray, no staffing badge
4. Task bars skip non-working days with gap rendering

- [ ] **Step 1: Replace `src/components/cx/GanttPanel.tsx` in full**

```typescript
"use client";

import { MapPin } from "lucide-react";
import { StaffingBadge } from "@/components/cx/StaffingBadge";
import { getStaffingStatus } from "@/lib/cx/staffing";
import { isNonWorkingDay } from "@/lib/cx/holidays";
import type { CxTask } from "@/lib/cx/types";
import type { OrgWorker } from "@/types/domain";

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function formatDayHeader(dateStr: string): { dow: string; date: string } {
  const d = new Date(dateStr + "T12:00:00");
  return {
    dow:  d.toLocaleDateString("en-US", { weekday: "short" }),
    date: d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
  };
}

interface GanttPanelProps {
  tasks:                CxTask[];
  projectId:            string;
  workers:              OrgWorker[];
  today:                string;
  monday:               string;
  onTaskClick:          (task: CxTask) => void;
  canEdit:              boolean;
  workingHolidayDates?: string[];
}

const GRID_COLS = "160px repeat(14, minmax(0, 1fr))";

export function GanttPanel({
  tasks,
  projectId,
  workers,
  today,
  monday,
  onTaskClick,
  canEdit,
  workingHolidayDates = [],
}: GanttPanelProps) {
  const ganttDates   = Array.from({ length: 14 }, (_, i) => addDays(monday, i));
  const projectTasks = tasks.filter(
    (t): t is CxTask & { startDate: string; endDate: string } =>
      t.projectId === projectId &&
      t.status !== "complete" &&
      !!t.startDate &&
      !!t.endDate,
  );

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: "700px" }}>

        {/* Date header */}
        <div
          className="border-b border-surface-border"
          style={{ display: "grid", gridTemplateColumns: GRID_COLS }}
        >
          <div className="w-40" />
          {ganttDates.map((date) => {
            const nonWorking = isNonWorkingDay(date, workingHolidayDates);
            const { dow, date: dateNum } = formatDayHeader(date);
            const staffing = nonWorking ? null : getStaffingStatus(projectTasks, date, workers);
            return (
              <div
                key={date}
                className={[
                  "text-center py-1 px-0.5 border-l border-surface-border",
                  nonWorking
                    ? "bg-surface-raised/60"
                    : date === today
                    ? "bg-gold/5"
                    : "",
                ].join(" ")}
              >
                <p className={`text-[9px] font-bold ${nonWorking ? "text-content-subtle" : date === today ? "text-gold" : "text-content-muted"}`}>
                  {dow}
                </p>
                <p className={`text-[9px] ${nonWorking ? "text-content-subtle" : date === today ? "text-gold" : "text-content-muted"}`}>
                  {dateNum}
                </p>
                {!nonWorking && staffing && (
                  <div className="mt-0.5 flex justify-center">
                    <StaffingBadge status={staffing} size="xs" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Task rows */}
        {projectTasks.map((task) => (
          <div
            key={task.id}
            className="border-b border-surface-border hover:bg-surface-raised/50 group"
            style={{ display: "grid", gridTemplateColumns: GRID_COLS }}
          >
            <div
              className={`px-2 py-2 ${canEdit ? "cursor-pointer" : "cursor-default"}`}
              onClick={() => onTaskClick(task)}
            >
              <p className="text-xs font-semibold text-content-primary truncate group-hover:text-gold transition-colors">
                {task.name}
              </p>
              {task.location && (
                <p className="text-[9px] text-content-muted flex items-center gap-0.5 mt-0.5">
                  <MapPin size={8} />{task.location}
                </p>
              )}
            </div>
            {ganttDates.map((date) => {
              const nonWorking = isNonWorkingDay(date, workingHolidayDates);
              const active     = !nonWorking && date >= task.startDate && date <= task.endDate;

              const prevDate   = addDays(date, -1);
              const nextDate   = addDays(date, 1);
              const prevActive = !isNonWorkingDay(prevDate, workingHolidayDates)
                && prevDate >= task.startDate && prevDate <= task.endDate;
              const nextActive = !isNonWorkingDay(nextDate, workingHolidayDates)
                && nextDate >= task.startDate && nextDate <= task.endDate;
              const isStart    = active && !prevActive;
              const isEnd      = active && !nextActive;

              return (
                <div
                  key={date}
                  className={[
                    "border-l border-surface-border py-2 flex items-center",
                    nonWorking
                      ? "bg-surface-raised/60"
                      : date === today
                      ? "bg-gold/5"
                      : "",
                  ].join(" ")}
                >
                  {active && (
                    <div
                      className={[
                        "h-4 w-full bg-gold/25 border-t border-b border-gold/40",
                        isStart ? "rounded-l-full ml-1 border-l border-gold/40" : "",
                        isEnd   ? "rounded-r-full mr-1 border-r border-gold/40" : "",
                      ].join(" ")}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {projectTasks.length === 0 && (
          <p className="text-sm text-content-muted py-8 text-center">
            No scheduled tasks yet. Set dates on draft tasks to see them here.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tui/bedrockos && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `GanttPanel.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/cx/GanttPanel.tsx
git commit -m "fix(gantt): uniform column widths via CSS grid; gray non-working days; bar gaps on holidays/weekends"
```

---

## Task 5: Wire `workingHolidayDates` into the Schedule Page

**Files:**
- Modify: `src/app/(shell)/modules/cru/schedule/page.tsx`

- [ ] **Step 1: Get the full project object and pass `workingHolidayDates` to GanttPanel**

In the schedule page, `useOrg()` returns `workers`, `currentProject`, `role`, and `projects`. Find the component that renders `<GanttPanel>` (around line 205) and add the prop.

Add `projects` to the destructure from `useOrg()` (around line 120):

```typescript
const { workers, currentProject, projects, role } = useOrg();
```

Then below, compute the working holiday dates:

```typescript
const project = projects.find((p) => p.id === currentProject.id);
const workingHolidayDates = project?.working_holiday_dates ?? [];
```

Then pass the prop to `<GanttPanel>`:

```tsx
<GanttPanel
  tasks={tasks}
  projectId={currentProject.id}
  workers={workers}
  today={today}
  monday={monday}
  onTaskClick={openEdit}
  canEdit={canEdit}
  workingHolidayDates={workingHolidayDates}
/>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tui/bedrockos && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(shell)/modules/cru/schedule/page.tsx"
git commit -m "feat(schedule): pass workingHolidayDates to GanttPanel"
```

---

## Task 6: Project Settings Page — Holiday Toggles

**Files:**
- Create: `src/app/(shell)/projects/[projectId]/settings/page.tsx`
- Create: `src/app/(shell)/projects/[projectId]/settings/client.tsx`
- Modify: `src/app/(shell)/projects/[projectId]/client.tsx`

- [ ] **Step 1: Create the server component page**

```typescript
// src/app/(shell)/projects/[projectId]/settings/page.tsx
import type { Metadata } from "next";
import { ProjectSettingsClient } from "./client";

type Params = Promise<{ projectId: string }>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Project Settings" };
}

export default async function ProjectSettingsPage({ params }: { params: Params }) {
  const { projectId } = await params;
  return <ProjectSettingsClient projectId={projectId} />;
}
```

- [ ] **Step 2: Create the client component**

```typescript
// src/app/(shell)/projects/[projectId]/settings/client.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { GCA_HOLIDAYS_2026 } from "@/lib/cx/holidays";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";

export function ProjectSettingsClient({ projectId }: { projectId: string }) {
  const { projects, setCurrentProject, updateProject } = useOrg();
  const project = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (project) {
      setCurrentProject({ id: project.id, name: project.name, slug: project.slug });
    }
  }, [project?.id, setCurrentProject]);

  if (!project) return null;

  const workingDates = project.working_holiday_dates ?? [];

  function toggleHoliday(date: string) {
    const next = workingDates.includes(date)
      ? workingDates.filter((d) => d !== date)
      : [...workingDates, date];
    updateProject(projectId, { working_holiday_dates: next });
  }

  return (
    <PageContainer>
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}`}
          className="flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors"
        >
          <ArrowLeft size={12} /> Back to {project.name}
        </Link>
      </div>
      <SectionHeader title="Project Settings" subtitle={project.name} />
      <Card className="mt-4">
        <h2 className="text-sm font-semibold text-content-primary mb-1">
          2026 GCA Holiday Schedule
        </h2>
        <p className="text-xs text-content-muted mb-4">
          All GCA holidays are non-working days by default. Toggle any holiday your crew will work — it will appear as a normal working day on the Gantt.
        </p>
        <div className="divide-y divide-surface-border">
          {GCA_HOLIDAYS_2026.map((h) => {
            const working = workingDates.includes(h.date);
            const label = new Date(h.date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month:   "long",
              day:     "numeric",
            });
            return (
              <div key={h.date} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-content-primary">{h.name}</p>
                  <p className="text-xs text-content-muted">{label}</p>
                </div>
                <button
                  onClick={() => toggleHoliday(h.date)}
                  className={[
                    "px-3 py-1 rounded text-xs font-medium transition-colors border",
                    working
                      ? "bg-gold/20 text-gold border-gold/40"
                      : "bg-surface-raised text-content-muted border-surface-border",
                  ].join(" ")}
                >
                  {working ? "Working" : "Holiday"}
                </button>
              </div>
            );
          })}
        </div>
      </Card>
    </PageContainer>
  );
}
```

- [ ] **Step 3: Add Settings link to the project command center**

In `src/app/(shell)/projects/[projectId]/client.tsx`, find where the project header / breadcrumb area is rendered (around line 349 where `role, projects, setCurrentProject` are destructured). Add a "Settings" link near the top of the page. Look for the `PageContainer` or `SectionHeader` and add:

```tsx
<Link
  href={`/projects/${projectId}/settings`}
  className="flex items-center gap-1 text-xs text-content-muted hover:text-content-primary transition-colors"
>
  <Settings size={12} /> Settings
</Link>
```

Import `Settings` from `lucide-react` at the top of the file (add to existing import line):

```typescript
import {
  ArrowLeft, ArrowRight, MapPin, User, Calendar,
  Wrench, Users, ClipboardCheck, ChevronRight,
  AlertCircle, Bell, Truck, DollarSign, Pencil, Settings,
} from "lucide-react";
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/tui/bedrockos && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(shell)/projects/[projectId]/settings/page.tsx" \
        "src/app/(shell)/projects/[projectId]/settings/client.tsx" \
        "src/app/(shell)/projects/[projectId]/client.tsx"
git commit -m "feat(projects): add project settings page with GCA holiday toggles"
```

---

## Self-Review Checklist

- [x] **Spec coverage:**
  - Holiday data hardcoded as constant → Task 1 ✓
  - `isNonWorkingDay()` utility → Task 1 ✓
  - DB migration for `working_holiday_dates` → Task 2 ✓
  - Type + fetch + server action updated → Task 3 ✓
  - Gantt column width bug fixed → Task 4 ✓
  - Non-working columns grayed → Task 4 ✓
  - Bar gaps on non-working days → Task 4 ✓
  - Schedule page wired → Task 5 ✓
  - Per-project holiday toggle UI → Task 6 ✓

- [x] **No placeholders** — all steps contain actual code

- [x] **Type consistency:**
  - `isNonWorkingDay(date: string, workingOverrides: string[])` — used with `workingHolidayDates` (string[]) everywhere ✓
  - `working_holiday_dates: string[]` on `Project`, `UpdateProjectInput`, server action, fetch ✓
  - `workingHolidayDates?: string[]` on `GanttPanelProps` ✓
  - `GCA_HOLIDAYS_2026` imported in `GanttPanel` (no — only `isNonWorkingDay` is imported there) ✓
  - `GCA_HOLIDAYS_2026` imported in settings client ✓
  - `addDays` used in `GanttPanel` for `prevDate`/`nextDate` — already defined in that file ✓
