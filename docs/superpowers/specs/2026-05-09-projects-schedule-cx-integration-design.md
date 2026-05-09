# Projects Schedule → CX Integration

**Date:** 2026-05-09
**Status:** Approved

## Problem

The Projects page Schedule tab shows hardcoded mock schedule data and the "Update Schedule" button routes to a CSV import panel. Real schedule data lives in the CX module (`cx_tasks` Supabase table) and is never surfaced on the project detail page. These are two independent systems with no connection.

## Goal

Wire the Projects page Schedule tab to read from the CX module's real task data for the active project. CSV import remains a valid migration path for users with an existing schedule from another tool.

## Approach

Fetch CX tasks in `ScheduleTab`, map them to the existing `ScheduleActivity` format, and pass as initial data into `useSchedule`. No changes to OrgProvider, no global state additions.

## Components Changed

### 1. `src/lib/actions/cx-tasks.ts` — new server action

Add `serverFetchCxTasksByProject(projectId: string): Promise<CxTask[]>`.

Queries `cx_tasks` table filtered by `project_id`. Returns empty array on error (graceful degradation).

### 2. `src/hooks/schedule/useSchedule.ts` — accept initial activities

Change signature:
```ts
useSchedule(projectId: string, initialActivities?: ScheduleActivity[])
```

When `initialActivities` is provided, use it instead of `MOCK_PROJECT_SCHEDULE`. All existing hook logic (mutations, AI chat, cascade proposals, postMessage) is unchanged.

### 3. `src/components/schedule/ScheduleTab.tsx` — rewired data source

**On mount:** fetch CX tasks via `serverFetchCxTasksByProject(projectId)`, map to `ScheduleActivity[]`, pass to `useSchedule`.

**CxTask → ScheduleActivity mapping:**
| CxTask field | ScheduleActivity field | Notes |
|---|---|---|
| `id` | `id` | direct |
| `projectId` | `projectId` | direct |
| `name` | `name` | direct |
| `type` | `phase` | CX task type serves as phase label |
| `startDate` | `startDate` | fallback to today if absent |
| `endDate` | `endDate` | fallback to startDate + 1 if absent |
| calculated | `duration` | calendar days between start and end |
| mapped | `status` | `not_started→upcoming`, `in_progress→active`, `on_hold→delayed`, `complete→complete` |
| `[]` | `notes` | empty on import |

**Empty state (no CX tasks for project):**
- Centered message: "No schedule for this project yet"
- Two CTAs: "Open CX Schedule" (link → `/modules/cru/schedule`) and "Import from CSV" (opens existing CSV panel)
- CSV panel behavior unchanged — imported activities populate the tab for the session

**With tasks:**
- ActivityList and AI chat work exactly as before
- Data is real CX tasks instead of mock

**"Update Schedule" button:**
- Navigates to `/modules/cru/schedule` instead of opening CSV panel
- This is the primary path for managing schedule entries going forward
- CSV import is accessible from the empty state only (migration path, not primary workflow)

## What Does Not Change

- `ActivityList` component — no changes
- `ScheduleChat` / AI chat — no changes
- `useSchedule` mutations (markActivityComplete, pushActivity, postMessage) — no changes
- CSV parser and column mapping logic — no changes
- CX module schedule page — no changes

## Out of Scope

- Writing CX task mutations back from the schedule tab (mark complete / push date do not sync back to `cx_tasks` — that is a future bidirectional sync feature)
- Persisting session-level schedule state to Supabase
- The CSV import path creating `cx_tasks` rows (import remains session-only)
