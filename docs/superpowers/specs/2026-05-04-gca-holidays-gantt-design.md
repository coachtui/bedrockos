# GCA Holiday Schedule — Gantt & Schedule Integration

**Date:** 2026-05-04  
**Status:** Approved

---

## Overview

Reflect the 2026 GCA (General Contractors Association of Hawaii) holiday schedule across all project schedules and Gantt charts. Non-working days (weekends + GCA holidays) are visually distinct, and task bars skip those days. Projects can toggle individual holidays as "working" when crews are scheduled to work despite the holiday.

---

## Holiday Data

All 16 GCA 2026 holidays are hardcoded in `src/lib/cx/holidays.ts` as a constant `GCA_HOLIDAYS_2026`. Each entry includes:

```ts
{ date: string; name: string }  // date in YYYY-MM-DD format
```

**2026 GCA Holidays:**
| Date | Holiday |
|------|---------|
| 2026-01-01 | New Year's Day |
| 2026-01-19 | Martin Luther King Jr. Day |
| 2026-02-16 | President's Day |
| 2026-03-26 | Prince Jonah Kuhio Day |
| 2026-04-03 | Good Friday |
| 2026-05-25 | Memorial Day |
| 2026-06-11 | King Kamehameha I Day |
| 2026-06-19 | Juneteenth |
| 2026-07-03 | Independence Day (observed) |
| 2026-08-21 | Statehood Day |
| 2026-09-07 | Labor Day |
| 2026-10-12 | Columbus Day |
| 2026-11-03 | General Election Day |
| 2026-11-11 | Veterans' Day |
| 2026-11-26 | Thanksgiving Day |
| 2026-12-25 | Christmas Day |

Holidays are applied uniformly to all projects. Year-over-year updates are a code change to this constant.

---

## Non-Working Day Logic

A new utility `isNonWorkingDay(date: string, workingOverrides: string[]): boolean` in `src/lib/cx/holidays.ts`:

- Returns `true` if the date is a Saturday or Sunday
- Returns `true` if the date is in `GCA_HOLIDAYS_2026` AND not in `workingOverrides`
- Returns `false` otherwise (normal working day)

---

## Gantt Chart Changes

### Column width fix (existing bug)
The staffing badge in Gantt column headers causes variable column widths, breaking alignment with task bars below. Fix: all columns share a uniform fixed width via a CSS grid definition (e.g., `grid-template-columns: repeat(N, minmax(0, 1fr))`), independent of header content.

### Non-working day visual treatment
- Non-working day columns (weekends + unoverridden holidays): gray background, slightly dimmed date header, no staffing badge
- Task bars **skip** non-working days — the bar renders only on working days within the task's date range (Option A: bar has gaps)
- Working-day columns: unchanged from current behavior

### Bar gap rendering
`GanttPanel` currently fills a continuous bar for every day between `startDate` and `endDate`. Updated logic:
- For each day cell, only render the bar segment if `isNonWorkingDay(date, project.workingHolidayDates)` is false
- Rounded corners apply to the first and last **working** day of the task, not the first/last calendar day

---

## Per-Project Holiday Overrides

### Data model
Add `working_holiday_dates: string[]` (JSONB, default `[]`) to the `projects` table via Supabase migration.

This field stores the dates (YYYY-MM-DD) of GCA holidays the project will work through. If a holiday date is present in this array, it is treated as a normal working day for that project.

### UI — Project Settings
A "Holiday Schedule" section in project settings lists all 16 GCA holidays with the date and name. Each row has a toggle: off by default (holiday observed), on = "Working this day." Toggling updates `working_holiday_dates` on the project record via a server action.

---

## Scope

**In scope:**
- `src/lib/cx/holidays.ts` — `GCA_HOLIDAYS_2026` constant + `isNonWorkingDay()` utility
- `GanttPanel.tsx` — column width fix + gray non-working columns + bar gap rendering
- Supabase migration — `working_holiday_dates` on projects table
- Project settings page — holiday toggle UI + server action

**Out of scope:**
- Calendar view (schedule page) — holiday markers deferred
- Duration recalculation (originalDuration/remainingDuration remain as imported; no auto-adjustment)
- Multi-year holiday support
- Per-org holiday defaults

---

## Files Affected

| File | Change |
|------|--------|
| `src/lib/cx/holidays.ts` | New file — holiday constant + isNonWorkingDay() |
| `src/components/cx/GanttPanel.tsx` | Column width fix + non-working day rendering |
| `src/app/(shell)/projects/[projectId]/settings/page.tsx` | New route — holiday toggle UI |
| `src/lib/actions/projects.ts` | Add updateWorkingHolidays server action (file exists) |
| `supabase/migrations/20260504_projects_working_holidays.sql` | Add working_holiday_dates column |
