# Project Schedule Agent — Design Spec

**Status:** Approved  
**Date:** 2026-04-25  
**Feature:** AI-powered living project schedule with conversational update loop  
**Surface:** Project page — Schedule tab (shell-level, not a new module)

---

## Problem

Construction project schedules are uploaded once and go stale immediately. Field reality diverges from the plan daily — work finishes early, tasks get pushed, crews get resequenced — but the schedule document never reflects it. PMs and supes lose confidence in it and stop using it.

---

## Solution

A living schedule that the supe maintains through conversation. The agent posts a 3-week rolling lookahead weekly, cross-references crew availability, equipment status, and the pour/pump schedule, and surfaces gaps before they become day-of problems. The supe replies in the thread to keep the schedule accurate. Changes are always proposed first and confirmed before applying.

---

## Architecture

This feature lives at the **project level** (shell), not as a standalone module. It coordinates across CRU, MX, OPS, and Inspect — it is the coordination layer, not one workflow inside a module.

The project page gets a **Schedule tab** with two zones:
- **Activity list** — live sortable table, source of truth
- **Schedule chat thread** — conversational interface with the agent

### Data Sources the Agent Reads

| Source | What it uses |
|--------|-------------|
| Project Schedule | Activity list, dates, phases, statuses |
| CRU | Worker/crew availability by project |
| MX / Assets | Equipment assignment + upcoming maintenance |
| OPS Pour Schedule | Booked pours + pump truck events |
| Inspect | Scheduled inspections — agent flags when a pour or phase has no pre/post inspection booked |

---

## Data Model

### `ScheduleActivity`

```ts
interface ScheduleActivity {
  id:           string;
  projectId:    string;
  name:         string;          // "Grub Phase 1"
  phase:        string;          // "Sitework", "Foundation", etc.
  startDate:    string;          // "YYYY-MM-DD"
  endDate:      string;          // "YYYY-MM-DD"
  duration:     number;          // days
  status:       "upcoming" | "active" | "complete" | "delayed";
  completedAt?: string;
  pushedDays?:  number;          // running tally of total days pushed
  notes:        string[];        // supe comments from chat
}
```

### `ProjectSchedule`

```ts
interface ProjectSchedule {
  id:            string;
  projectId:     string;
  uploadedAt:    string;
  columnMap:     Record<string, string>;  // user's CSV column → our field
  activities:    ScheduleActivity[];
  lastUpdatedAt: string;
}
```

### `ScheduleMessage`

```ts
type ScheduleMessageType =
  | "lookahead"         // agent's 3-week card
  | "resource_alert"    // crew / equipment / pour gap
  | "cascade_proposal"  // proposed downstream adjustments
  | "user_update"       // supe or PM reply
  | "confirmation";     // agent summary after change applied

interface ScheduleMessage {
  id:        string;
  projectId: string;
  type:      ScheduleMessageType;
  author:    "agent" | string;    // userId for human messages
  body:      string;
  payload?:  ScheduleMutation[];  // structured mutations on proposals
  status:    "pending" | "confirmed" | "dismissed";
  createdAt: string;
}
```

### `ScheduleMutation`

```ts
interface ScheduleMutation {
  activityId:    string;
  type:          "mark_complete" | "push_date" | "pull_forward" | "swap";
  newStartDate?: string;
  newEndDate?:   string;
  completedAt?:  string;
}
```

---

## CSV Import

**Format:** Any CSV export from Excel, Smartsheet, or Procore's schedule export.

**Import flow:**
1. PM uploads CSV
2. Platform detects columns and shows a one-time **column mapping step** — PM maps their columns to: Activity Name, Start Date, End Date, Phase, Duration
3. Mapping is saved on `ProjectSchedule.columnMap` for future re-uploads
4. Activities are parsed and stored; the agent is ready

**Re-upload:** PM can upload a revised CSV at any time. Existing activity statuses and notes are preserved where activity names match; new activities are added; removed activities are archived (not deleted).

---

## Agent Logic

### Weekly Trigger (Monday morning)

1. Pull all `ScheduleActivity` entries for the project with dates in the next 3 weeks
2. Group into **Week 1** (execution), **Week 2** (preparation), **Week 3** (forecast)
3. Cross-reference:
   - **CRU**: flag phases that imply crew types not currently available on the project. Phase 1 uses a hardcoded phase→crew mapping (e.g. "Sitework" → mason/operator, "Foundation" → mason/finisher, "Framing" → carpenter). This mapping is configurable in Phase 3.
   - **MX/Assets**: flag equipment assigned to the project with maintenance due within the window
   - **OPS**: flag Week 1–3 activities that imply a pour but have no booked pour event
4. Post a `lookahead` message (3-week card) + any `resource_alert` messages into the thread

### 3-Week Lookahead Purpose

- **Week 1** — execution: what's active, are we on track
- **Week 2** — preparation: what needs to be staged, booked, or confirmed
- **Week 3** — forecast: early signal for crew/equipment/pour gaps

### Handling a User Reply

1. Claude API parses intent: mark done / push date / add note / question
2. If mutation: identify the activity, build a `ScheduleMutation`
3. Scan for downstream activities affected by the date change
4. Post a `cascade_proposal` listing affected activities with proposed new dates
5. On confirm: apply all mutations, update the activity list, post a `confirmation` summary

### On-Demand Requests

Users can request at any time:
- **Pump schedule** — "what's the pump schedule for next week?" → agent reads OPS pour events and renders a pump card in the thread
- **Gantt chart** — "show me the Gantt" or Export button → generate from current activity state

### What the Agent Never Does Autonomously

- Apply any mutation without a `confirmed` message status
- Create pour events in OPS (proposes, PM books in OPS)
- Assign crew or schedule maintenance (surfaces the gap, links to CRU/MX)

---

## Role Access

| Role | Permissions |
|------|------------|
| PM / Project Engineer | Upload CSV, full chat, Export Gantt, request pump schedule |
| Superintendent | Chat, confirm/push activities, Export Gantt, request pump schedule |
| Foreman | Chat read + Done/Push/Note quick actions only, view pump schedule. Cannot confirm cascade proposals — those require Supe or PM. |

---

## UI Layout

### Desktop — Two-Pane

```
┌─────────────────────────────┬──────────────────────────┐
│  Activity List              │  Schedule Chat            │
│  ─────────────────────────  │  ───────────────────────  │
│  [Upload CSV] [Export Gantt]│                           │
│                             │  ┌─ Agent ──────────────┐ │
│  Phase       Activity  Stat │  │ 3-Week Lookahead      │ │
│  ─────────── ──────── ──── │  │ Week 1 ▸ Week 2 ▸ Wk3│ │
│  Sitework    Grub P1   ✓   │  │ [Resource Alert 🟡]   │ │
│  Sitework    Grub P2   →   │  └──────────────────────┘ │
│  Foundation  Excav.    ...  │                           │
│                             │  Supe: "we finished       │
│                             │  grub phase 1 last week"  │
│                             │                           │
│                             │  ┌─ Agent ──────────────┐ │
│                             │  │ Cascade Proposal       │ │
│                             │  │ • Pull Grub P2 fwd 3d  │ │
│                             │  │ • Pull Excav. fwd 3d   │ │
│                             │  │ [Confirm] [Dismiss]    │ │
│                             │  └──────────────────────┘ │
│                             │                           │
│                             │  [__________________] Send│
└─────────────────────────────┴──────────────────────────┘
```

### Mobile — Chat-First, Two Tabs

- **Chat tab** (default): full-width thread, agent cards stack vertically, quick-action buttons (Done / Push / Note) on each activity chip — no typing required for routine updates
- **Schedule tab**: activity cards grouped by phase, status badges, tap to add a note

### Message Type Styles

| Message | Visual Treatment |
|---------|-----------------|
| Agent lookahead | Teal accent, 3 collapsible week sections |
| Resource alert | Amber accent, links to CRU / MX / OPS |
| Cascade proposal | Blue accent, Confirm / Dismiss buttons |
| Pump/pour card | OPS orange accent, pump time + pour details |
| User message | Right-aligned, standard |
| Confirmation summary | Muted, "✓ 2 activities updated" |

### Gantt Export

Generated on demand from the current `activities` array:
- Horizontal bar chart grouped by phase
- Bars colored by status: active = teal, complete = green, delayed = amber, upcoming = muted
- Export as PNG or PDF
- Mobile: fullscreen scrollable preview with share/download button

---

## Feature Flag

```ts
features: {
  schedule: {
    ai_agent: false,  // org-level gate
  }
}
```

Disabled = Schedule tab visible but locked (consistent with entitlement model).

---

## Phase Plan

| Phase | Scope |
|-------|-------|
| 1 | CSV import + column mapping + activity list (mock data) |
| 2 | Schedule chat thread — agent lookahead posts, user replies, cascade proposals |
| 3 | Cross-module reads — CRU crew alerts, MX equipment alerts, OPS pour/pump cards |
| 4 | Gantt export (SVG/PNG/PDF) |
| 5 | Weekly cron trigger + real Claude API integration (backend phase) |
| 6 | Mobile quick-action buttons + push notifications |
