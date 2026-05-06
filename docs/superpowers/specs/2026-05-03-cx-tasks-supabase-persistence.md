# CX Tasks + Day Assignments — Supabase Persistence

## Context

CX tasks and day assignments are currently pure in-memory React state seeded from
mock data files. Every browser refresh resets them. This blocks real demo data and
is the last major piece of CX state that hasn't been wired to Supabase (projects,
workers, and crews already are).

**Goal:** Persist `cx_tasks` and `cx_day_assignments` in Supabase so a user can
create tasks and assignments via the UI and have them survive a refresh. This unblocks
populating real civil demo data before the upcoming buyer demo.

---

## Scope

**In:** `CxTask`, `CxDayAssignment`

**Out:** `CxEvent` (calendar events — lower priority, stays mock for now)

---

## Schema

### `cx_tasks`

| Column               | Type       | Notes                                          |
|----------------------|------------|------------------------------------------------|
| id                   | text PK    |                                                |
| org_id               | text       | FK to org, indexed                             |
| project_id           | text       | FK to projects                                 |
| name                 | text       |                                                |
| type                 | text       | pour / inspection / delivery / grading / etc.  |
| start_date           | date       | nullable — null = draft                        |
| end_date             | date       | nullable — null = draft                        |
| location             | text       | nullable                                       |
| status               | text       | not_started / in_progress / on_hold / complete |
| crew_requirements    | jsonb      | `[{role, count}]`                              |
| assigned_worker_ids  | text[]     |                                                |
| notes                | text       | nullable                                       |
| external_id          | text       | nullable — spreadsheet import tracking         |
| created_at           | timestamptz| default now()                                  |

### `cx_day_assignments`

| Column      | Type       | Notes               |
|-------------|------------|---------------------|
| id          | text PK    |                     |
| org_id      | text       | indexed             |
| worker_id   | text       |                     |
| project_id  | text       |                     |
| date        | date       |                     |
| created_at  | timestamptz| default now()       |

Unique constraint on `(org_id, worker_id, date)` — one assignment per worker per day.

---

## Data Flow

```
ShellRootLayout (server)
  └── fetchOrgTasks + fetchOrgAssignments (server, per org)
        └── CxProvider (client) — seeded from initial props
              └── mutations call server actions → optimistic update in reducer
```

Tasks and assignments are fetched at the **CX module layout level**
(`/modules/cru/layout.tsx`), not the shell root layout. This keeps the shell
layout lean — tasks are only fetched when the user navigates into CX.

---

## New Files

- `src/lib/supabase/cx-tasks.ts` — `fetchOrgTasks(orgId)`
- `src/lib/supabase/cx-assignments.ts` — `fetchOrgAssignments(orgId)`
- `src/lib/actions/cx-tasks.ts` — `createTask`, `updateTask`, `deleteTask`
- `src/lib/actions/cx-assignments.ts` — `createAssignment`, `removeAssignment`
- `src/app/(shell)/modules/cru/layout.tsx` — server component, fetches + passes initial data

## Changed Files

- `src/providers/CxProvider.tsx` — accept `initialTasks` and `initialAssignments` props;
  wire mutations to server actions (optimistic dispatch first, then async server call)
- `src/app/(shell)/shell-client.tsx` — pass CX initial props through to CxProvider

---

## Mutation Strategy

Optimistic updates: dispatch to local reducer immediately, fire server action
async in the background. No loading states needed for individual task edits —
the UI stays snappy and Supabase is the source of truth on next load.

Delete is not exposed in the current UI — skip for now.

---

## Out of Scope

- Real-time sync (Supabase Realtime)
- Per-project scoped fetching (fetch all org tasks, filter client-side — same
  pattern as workers)
- CxEvent persistence
- CSV import writing to Supabase (import still writes to local state; persistence
  comes in a follow-on)
