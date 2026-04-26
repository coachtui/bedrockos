# Project Schedule Agent — Phase 1 & 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Schedule tab to the project command center with CSV import, a live activity list, and an AI-powered chat thread for 3-week lookahead, cascade proposals, and schedule maintenance.

**Architecture:** A `useSchedule` hook manages activity + message state initialized from mock data. Pure functions in `src/lib/schedule/` handle CSV parsing, intent detection, and cascade proposal generation — no Claude API yet (Phase 5). The project command center gains a tab bar; selecting "Schedule" renders a two-pane `ScheduleTab` (activity list left, chat right on desktop; tab-switched on mobile).

**Tech Stack:** TypeScript, React (Next.js App Router), Tailwind CSS

**Scope:** Phases 1–2 of the spec. Phases 3–4 (cross-module reads + Gantt export) are a follow-up plan.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/types/org.ts` | Modify | Add `"schedule"` to `ModuleId` union |
| `src/lib/config/org.ts` | Modify | Add `schedule: { ai_agent: true }` to features |
| `src/lib/schedule/types.ts` | **Create** | All TS interfaces for schedule domain |
| `src/lib/schedule/utils.ts` | **Create** | Pure date helpers: `addDays`, `diffDays`, `getWeekBuckets` |
| `src/lib/schedule/csv-parser.ts` | **Create** | `parseCSVText`, `detectColumnMap`, `applyColumnMap` |
| `src/lib/schedule/agent.ts` | **Create** | `parseUserIntent`, `buildMarkCompleteProposal`, `buildPushDateProposal`, `applyMutations`, `generateWeeklyLookahead` |
| `src/lib/schedule/mock-data.ts` | **Create** | `MOCK_PROJECT_SCHEDULE` + `MOCK_SCHEDULE_MESSAGES` for Highland Tower |
| `src/hooks/schedule/useSchedule.ts` | **Create** | State hook wiring all schedule actions |
| `src/components/schedule/ActivityList.tsx` | **Create** | Card-based activity list with status badges |
| `src/components/schedule/CsvUploadPanel.tsx` | **Create** | File input + column mapping step |
| `src/components/schedule/LookaheadCard.tsx` | **Create** | Agent 3-week lookahead card with quick-action chips |
| `src/components/schedule/CascadeProposalCard.tsx` | **Create** | Cascade proposal with Confirm / Dismiss |
| `src/components/schedule/ResourceAlertCard.tsx` | **Create** | Amber resource alert card |
| `src/components/schedule/ScheduleChat.tsx` | **Create** | Chat thread container + text input bar |
| `src/components/schedule/ScheduleTab.tsx` | **Create** | Two-pane layout (activity list + chat) |
| `src/app/(shell)/projects/[projectId]/client.tsx` | Modify | Add Overview / Schedule tab bar |

---

## Task 1: ModuleId extension and feature flag

**Files:**
- Modify: `src/types/org.ts`
- Modify: `src/lib/config/org.ts`

- [ ] **Step 1: Add "schedule" to ModuleId**

In `src/types/org.ts`, update the `ModuleId` union:

```typescript
// Before:
export type ModuleId = "cru" | "fix" | "inspect" | "datum" | "ops" | "mx";

// After:
export type ModuleId = "cru" | "fix" | "inspect" | "datum" | "ops" | "mx" | "schedule";
```

- [ ] **Step 2: Add schedule feature flag to org config**

In `src/lib/config/org.ts`, add `schedule` to `MOCK_ORG_CONFIG.features` after the `mx` block:

```typescript
    mx: {
      ai_scheduling: false,
    },
    schedule: {
      ai_agent: true,
    },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/org.ts src/lib/config/org.ts
git commit -m "feat(schedule): add schedule ModuleId and ai_agent feature flag"
```

---

## Task 2: Schedule types

**Files:**
- Create: `src/lib/schedule/types.ts`

- [ ] **Step 1: Create `src/lib/schedule/types.ts`**

```typescript
export type ScheduleActivityStatus = "upcoming" | "active" | "complete" | "delayed";

export interface ScheduleActivity {
  id:           string;
  projectId:    string;
  name:         string;
  phase:        string;
  startDate:    string;   // "YYYY-MM-DD"
  endDate:      string;   // "YYYY-MM-DD"
  duration:     number;   // calendar days
  status:       ScheduleActivityStatus;
  completedAt?: string;
  pushedDays?:  number;   // running tally of days pushed
  notes:        string[];
}

export type ScheduleMessageType =
  | "lookahead"
  | "resource_alert"
  | "cascade_proposal"
  | "user_update"
  | "confirmation";

export type MutationType = "mark_complete" | "push_date" | "pull_forward";

export interface ScheduleMutation {
  activityId:    string;
  type:          MutationType;
  newStartDate?: string;
  newEndDate?:   string;
  completedAt?:  string;
}

export interface ScheduleMessage {
  id:        string;
  projectId: string;
  type:      ScheduleMessageType;
  author:    "agent" | string;
  body:      string;
  payload?:  ScheduleMutation[];
  status:    "pending" | "confirmed" | "dismissed";
  createdAt: string;
}

export interface ProjectSchedule {
  id:            string;
  projectId:     string;
  uploadedAt:    string;
  columnMap:     ColumnMap;
  activities:    ScheduleActivity[];
  lastUpdatedAt: string;
}

export interface ColumnMap {
  activityName: string;
  phase:        string;
  startDate:    string;
  endDate:      string;
  duration?:    string;
}

export type ParsedIntentType = "mark_complete" | "push_date" | "add_note";

export interface ParsedIntent {
  type:        ParsedIntentType;
  activityId?: string;
  days?:       number;
  rawText:     string;
}

export interface WeekBucket {
  label:      string;   // "Week 1", "Week 2", "Week 3"
  startDate:  string;
  endDate:    string;
  activities: ScheduleActivity[];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/schedule/types.ts
git commit -m "feat(schedule): add schedule domain types"
```

---

## Task 3: Date utilities and CSV parser

**Files:**
- Create: `src/lib/schedule/utils.ts`
- Create: `src/lib/schedule/csv-parser.ts`

- [ ] **Step 1: Create `src/lib/schedule/utils.ts`**

```typescript
import type { ScheduleActivity, WeekBucket } from "./types";

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function diffDays(laterDate: string, earlierDate: string): number {
  const a = new Date(laterDate).getTime();
  const b = new Date(earlierDate).getTime();
  return Math.round((a - b) / 86_400_000);
}

export function startOfWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export function getWeekBuckets(
  activities: ScheduleActivity[],
  fromDate: string,
): WeekBucket[] {
  const weekStart = startOfWeek(fromDate);
  return [1, 2, 3].map((n) => {
    const start = addDays(weekStart, (n - 1) * 7);
    const end   = addDays(start, 6);
    return {
      label:     `Week ${n}`,
      startDate: start,
      endDate:   end,
      activities: activities.filter(
        (a) => a.startDate <= end && a.endDate >= start && a.status !== "complete",
      ),
    };
  });
}

export function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
  });
}
```

- [ ] **Step 2: Create `src/lib/schedule/csv-parser.ts`**

```typescript
import type { ColumnMap, ScheduleActivity } from "./types";
import { diffDays } from "./utils";

export function parseCSVText(text: string): string[][] {
  return text
    .trim()
    .split("\n")
    .map((row) =>
      row.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")),
    );
}

const ACTIVITY_NAME_PATTERNS = ["task name", "activity name", "activity", "task", "description", "name"];
const PHASE_PATTERNS          = ["phase", "phase name", "wbs", "category"];
const START_DATE_PATTERNS     = ["start date", "start", "begin date", "begin", "scheduled start"];
const END_DATE_PATTERNS       = ["end date", "end", "finish date", "finish", "scheduled finish", "completion"];
const DURATION_PATTERNS       = ["duration", "days", "duration (days)"];

function matchHeader(header: string, patterns: string[]): boolean {
  return patterns.some((p) => header.toLowerCase().includes(p));
}

export function detectColumnMap(headers: string[]): Partial<ColumnMap> {
  const result: Partial<ColumnMap> = {};
  for (const h of headers) {
    if (!result.activityName && matchHeader(h, ACTIVITY_NAME_PATTERNS)) result.activityName = h;
    if (!result.phase        && matchHeader(h, PHASE_PATTERNS))          result.phase        = h;
    if (!result.startDate    && matchHeader(h, START_DATE_PATTERNS))     result.startDate    = h;
    if (!result.endDate      && matchHeader(h, END_DATE_PATTERNS))       result.endDate      = h;
    if (!result.duration     && matchHeader(h, DURATION_PATTERNS))       result.duration     = h;
  }
  return result;
}

export function applyColumnMap(
  rows:      string[][],
  headers:   string[],
  columnMap: ColumnMap,
  projectId: string,
): ScheduleActivity[] {
  const idx = (col: string) => headers.indexOf(col);

  const nameIdx  = idx(columnMap.activityName);
  const phaseIdx = idx(columnMap.phase);
  const startIdx = idx(columnMap.startDate);
  const endIdx   = idx(columnMap.endDate);
  const durIdx   = columnMap.duration ? idx(columnMap.duration) : -1;

  return rows
    .slice(1) // skip header row
    .filter((row) => row[nameIdx]?.trim())
    .map((row, i) => {
      const startDate = row[startIdx]?.trim() ?? "";
      const endDate   = row[endIdx]?.trim()   ?? "";
      const duration  = durIdx >= 0 && row[durIdx]
        ? parseInt(row[durIdx], 10)
        : diffDays(endDate, startDate);

      return {
        id:        `sched_imported_${i + 1}`,
        projectId,
        name:      row[nameIdx].trim(),
        phase:     row[phaseIdx]?.trim() ?? "Uncategorized",
        startDate,
        endDate,
        duration:  isNaN(duration) ? 0 : duration,
        status:    "upcoming" as const,
        notes:     [],
      };
    });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/schedule/utils.ts src/lib/schedule/csv-parser.ts
git commit -m "feat(schedule): add date utils and CSV parser"
```

---

## Task 4: Agent pure functions

**Files:**
- Create: `src/lib/schedule/agent.ts`

- [ ] **Step 1: Create `src/lib/schedule/agent.ts`**

```typescript
import type {
  ScheduleActivity, ScheduleMutation, ParsedIntent,
  ScheduleMessage, WeekBucket,
} from "./types";
import { addDays, diffDays, getWeekBuckets, formatDisplayDate } from "./utils";

// ── Intent parsing ────────────────────────────────────────────────────────────

export function parseUserIntent(
  text:       string,
  activities: ScheduleActivity[],
): ParsedIntent {
  const lower = text.toLowerCase();

  const matchedActivity = activities.find((a) =>
    a.name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .some((word) => lower.includes(word)),
  );

  const isDone = /\b(done|finished|complete|completed|wrapped|wrap)\b/.test(lower);
  const isPush = /\b(push|delay|extend|postpone|moved?|pushing)\b/.test(lower);

  const weekMatch = lower.match(/(\d+)\s*week/);
  const dayMatch  = lower.match(/(\d+)\s*day/);
  const days = weekMatch
    ? parseInt(weekMatch[1], 10) * 7
    : dayMatch
    ? parseInt(dayMatch[1], 10)
    : 7;

  if (isDone) {
    return { type: "mark_complete", activityId: matchedActivity?.id, rawText: text };
  }
  if (isPush) {
    return { type: "push_date", activityId: matchedActivity?.id, days, rawText: text };
  }
  return { type: "add_note", rawText: text };
}

// ── Downstream cascade helpers ────────────────────────────────────────────────

function getDownstream(
  anchorEndDate: string,
  activities:    ScheduleActivity[],
  excludeId:     string,
): ScheduleActivity[] {
  return activities.filter(
    (a) => a.id !== excludeId && a.status !== "complete" && a.startDate >= anchorEndDate,
  );
}

// ── Proposal builders ─────────────────────────────────────────────────────────

export function buildMarkCompleteProposal(
  activityId: string,
  activities: ScheduleActivity[],
  today:      string,
): ScheduleMutation[] {
  const activity = activities.find((a) => a.id === activityId);
  if (!activity) return [];

  const mutations: ScheduleMutation[] = [
    { activityId, type: "mark_complete", completedAt: today },
  ];

  const daysEarly = diffDays(activity.endDate, today); // positive = finished before scheduled end
  if (daysEarly > 1) {
    const downstream = getDownstream(activity.endDate, activities, activityId);
    downstream.forEach((a) => {
      mutations.push({
        activityId:   a.id,
        type:         "pull_forward",
        newStartDate: addDays(a.startDate, -daysEarly),
        newEndDate:   addDays(a.endDate,   -daysEarly),
      });
    });
  }

  return mutations;
}

export function buildPushDateProposal(
  activityId: string,
  days:       number,
  activities: ScheduleActivity[],
): ScheduleMutation[] {
  const activity = activities.find((a) => a.id === activityId);
  if (!activity) return [];

  const mutations: ScheduleMutation[] = [
    {
      activityId,
      type:         "push_date",
      newStartDate: addDays(activity.startDate, days),
      newEndDate:   addDays(activity.endDate,   days),
    },
  ];

  const downstream = getDownstream(activity.endDate, activities, activityId);
  downstream.forEach((a) => {
    mutations.push({
      activityId:   a.id,
      type:         "push_date",
      newStartDate: addDays(a.startDate, days),
      newEndDate:   addDays(a.endDate,   days),
    });
  });

  return mutations;
}

// ── Apply mutations to activity list ─────────────────────────────────────────

export function applyMutations(
  activities: ScheduleActivity[],
  mutations:  ScheduleMutation[],
): ScheduleActivity[] {
  return activities.map((a) => {
    const m = mutations.find((mut) => mut.activityId === a.id);
    if (!m) return a;

    if (m.type === "mark_complete") {
      return { ...a, status: "complete", completedAt: m.completedAt ?? a.endDate };
    }
    if (m.type === "push_date") {
      return {
        ...a,
        startDate:  m.newStartDate ?? a.startDate,
        endDate:    m.newEndDate   ?? a.endDate,
        pushedDays: (a.pushedDays ?? 0) + (m.newStartDate ? diffDays(m.newStartDate, a.startDate) : 0),
      };
    }
    if (m.type === "pull_forward") {
      return {
        ...a,
        startDate: m.newStartDate ?? a.startDate,
        endDate:   m.newEndDate   ?? a.endDate,
      };
    }
    return a;
  });
}

// ── Weekly lookahead ──────────────────────────────────────────────────────────

export function generateWeeklyLookahead(
  activities: ScheduleActivity[],
  fromDate:   string,
): { buckets: WeekBucket[]; messageBody: string } {
  const buckets = getWeekBuckets(activities, fromDate);

  const lines: string[] = ["Here's your 3-week schedule lookahead:", ""];
  buckets.forEach((bucket) => {
    lines.push(
      `**${bucket.label}** (${formatDisplayDate(bucket.startDate)} – ${formatDisplayDate(bucket.endDate)}):`,
    );
    if (bucket.activities.length === 0) {
      lines.push("  No scheduled activities.");
    } else {
      bucket.activities.forEach((a) => {
        lines.push(`  • ${a.name} — ${a.phase} (${formatDisplayDate(a.startDate)}–${formatDisplayDate(a.endDate)})`);
      });
    }
    lines.push("");
  });

  lines.push("Reply with updates: mark activities done, push dates, or flag issues.");

  return { buckets, messageBody: lines.join("\n") };
}

// ── Message factory ───────────────────────────────────────────────────────────

let _msgCounter = 1000;
export function makeMessageId(): string {
  return `smsg_${++_msgCounter}`;
}

export function buildCascadeProposalBody(mutations: ScheduleMutation[], activities: ScheduleActivity[]): string {
  const hasPrimary = mutations.some((m) => m.type === "mark_complete");
  const cascades   = mutations.filter((m) => m.type === "push_date" || m.type === "pull_forward");

  const lines: string[] = [];

  if (hasPrimary) {
    const primary = mutations.find((m) => m.type === "mark_complete")!;
    const a = activities.find((x) => x.id === primary.activityId);
    lines.push(`Marked **${a?.name}** complete.`);
    if (cascades.length > 0) {
      lines.push(`\nI can pull these downstream activities forward:`);
    }
  } else if (cascades.length > 0) {
    lines.push("Proposed schedule adjustments:");
  }

  cascades.forEach((m) => {
    const a = activities.find((x) => x.id === m.activityId);
    if (!a) return;
    const verb = m.type === "pull_forward" ? "Pull forward" : "Push out";
    lines.push(`  • ${verb} **${a.name}** → ${formatDisplayDate(m.newStartDate!)}–${formatDisplayDate(m.newEndDate!)}`);
  });

  if (cascades.length > 0) {
    lines.push("\nConfirm to apply all changes.");
  }

  return lines.join("\n");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/schedule/agent.ts
git commit -m "feat(schedule): add agent pure functions (intent parsing, cascade proposals, lookahead)"
```

---

## Task 5: Mock data

**Files:**
- Create: `src/lib/schedule/mock-data.ts`

- [ ] **Step 1: Create `src/lib/schedule/mock-data.ts`**

Activities cover Highland Tower — Phase 2 from late April through June 2026. The current date context is 2026-04-25 (Monday, Week 1 start).

```typescript
import type { ProjectSchedule, ScheduleMessage } from "./types";

export const MOCK_PROJECT_SCHEDULE: ProjectSchedule = {
  id:            "sched_highland_001",
  projectId:     "proj_highland_002",
  uploadedAt:    "2026-04-01T08:00:00Z",
  lastUpdatedAt: "2026-04-25T08:00:00Z",
  columnMap: {
    activityName: "Activity Name",
    phase:        "Phase",
    startDate:    "Start Date",
    endDate:      "End Date",
    duration:     "Duration",
  },
  activities: [
    // ── Foundation (some done, some active/upcoming) ───────────────────────
    {
      id: "sa_001", projectId: "proj_highland_002",
      name: "Excavation", phase: "Foundation",
      startDate: "2026-04-01", endDate: "2026-04-15", duration: 14,
      status: "complete", completedAt: "2026-04-14", notes: [],
    },
    {
      id: "sa_002", projectId: "proj_highland_002",
      name: "Formwork Level B1", phase: "Foundation",
      startDate: "2026-04-14", endDate: "2026-04-28", duration: 14,
      status: "active", notes: [],
    },
    {
      id: "sa_003", projectId: "proj_highland_002",
      name: "Rebar Installation B1", phase: "Foundation",
      startDate: "2026-04-28", endDate: "2026-05-02", duration: 4,
      status: "upcoming", notes: [],
    },
    {
      id: "sa_004", projectId: "proj_highland_002",
      name: "Concrete Pour B1", phase: "Foundation",
      startDate: "2026-05-02", endDate: "2026-05-03", duration: 1,
      status: "upcoming", notes: [],
    },
    // ── Structural ────────────────────────────────────────────────────────
    {
      id: "sa_005", projectId: "proj_highland_002",
      name: "Steel Erection Level 1", phase: "Structural",
      startDate: "2026-05-05", endDate: "2026-05-16", duration: 11,
      status: "upcoming", notes: [],
    },
    {
      id: "sa_006", projectId: "proj_highland_002",
      name: "Deck Form Level 1", phase: "Structural",
      startDate: "2026-05-12", endDate: "2026-05-19", duration: 7,
      status: "upcoming", notes: [],
    },
    {
      id: "sa_007", projectId: "proj_highland_002",
      name: "Concrete Pour Level 1", phase: "Structural",
      startDate: "2026-05-19", endDate: "2026-05-20", duration: 1,
      status: "upcoming", notes: [],
    },
    {
      id: "sa_008", projectId: "proj_highland_002",
      name: "Steel Erection Level 2", phase: "Structural",
      startDate: "2026-05-20", endDate: "2026-05-30", duration: 10,
      status: "upcoming", notes: [],
    },
    {
      id: "sa_009", projectId: "proj_highland_002",
      name: "Deck Form Level 2", phase: "Structural",
      startDate: "2026-05-26", endDate: "2026-06-02", duration: 7,
      status: "upcoming", notes: [],
    },
    {
      id: "sa_010", projectId: "proj_highland_002",
      name: "Concrete Pour Level 2", phase: "Structural",
      startDate: "2026-06-02", endDate: "2026-06-03", duration: 1,
      status: "upcoming", notes: [],
    },
    // ── MEP Rough-in ──────────────────────────────────────────────────────
    {
      id: "sa_011", projectId: "proj_highland_002",
      name: "Mechanical Rough Level 1", phase: "MEP Rough-in",
      startDate: "2026-05-20", endDate: "2026-06-10", duration: 21,
      status: "upcoming", notes: [],
    },
    {
      id: "sa_012", projectId: "proj_highland_002",
      name: "Electrical Rough Level 1", phase: "MEP Rough-in",
      startDate: "2026-05-22", endDate: "2026-06-12", duration: 21,
      status: "upcoming", notes: [],
    },
    {
      id: "sa_013", projectId: "proj_highland_002",
      name: "Plumbing Rough Level 1", phase: "MEP Rough-in",
      startDate: "2026-05-25", endDate: "2026-06-15", duration: 21,
      status: "upcoming", notes: [],
    },
  ],
};

export const MOCK_SCHEDULE_MESSAGES: ScheduleMessage[] = [
  {
    id: "smsg_001", projectId: "proj_highland_002",
    type: "lookahead", author: "agent", status: "confirmed",
    createdAt: "2026-04-21T07:00:00Z",
    body: "Here's your 3-week schedule lookahead:\n\n**Week 1** (Apr 21 – Apr 27):\n  • Formwork Level B1 — Foundation (Apr 14–Apr 28)\n\n**Week 2** (Apr 28 – May 4):\n  • Formwork Level B1 — Foundation (finishing)\n  • Rebar Installation B1 — Foundation (Apr 28–May 2)\n  • Concrete Pour B1 — Foundation (May 2–May 3)\n\n**Week 3** (May 5 – May 11):\n  • Steel Erection Level 1 — Structural (May 5–May 16)\n\nReply with updates: mark activities done, push dates, or flag issues.",
  },
  {
    id: "smsg_002", projectId: "proj_highland_002",
    type: "resource_alert", author: "agent", status: "pending",
    createdAt: "2026-04-21T07:00:02Z",
    body: "**Crew gap — Week 2:** Steel Erection Level 1 starts May 5. You currently have 2 ironworkers assigned to this project. Structural steel typically requires 4–6. Consider requesting additional crew from the pool before end of this week.",
  },
];
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/schedule/mock-data.ts
git commit -m "feat(schedule): add Highland Tower mock schedule and seed messages"
```

---

## Task 6: useSchedule hook

**Files:**
- Create: `src/hooks/schedule/useSchedule.ts`

- [ ] **Step 1: Create `src/hooks/schedule/useSchedule.ts`**

```typescript
"use client";

import { useState, useCallback } from "react";
import type {
  ProjectSchedule, ScheduleMessage, ScheduleActivity,
  ColumnMap, ParsedIntentType,
} from "@/lib/schedule/types";
import {
  parseUserIntent, buildMarkCompleteProposal, buildPushDateProposal,
  applyMutations, generateWeeklyLookahead, makeMessageId,
  buildCascadeProposalBody,
} from "@/lib/schedule/agent";
import { applyColumnMap, parseCSVText } from "@/lib/schedule/csv-parser";
import {
  MOCK_PROJECT_SCHEDULE,
  MOCK_SCHEDULE_MESSAGES,
} from "@/lib/schedule/mock-data";

export function useSchedule(projectId: string) {
  const [schedule,  setSchedule]  = useState<ProjectSchedule>(MOCK_PROJECT_SCHEDULE);
  const [messages,  setMessages]  = useState<ScheduleMessage[]>(MOCK_SCHEDULE_MESSAGES);

  const activities = schedule.activities;

  // ── Upload ────────────────────────────────────────────────────────────────

  const uploadSchedule = useCallback(
    (csvText: string, columnMap: ColumnMap) => {
      const rows       = parseCSVText(csvText);
      const headers    = rows[0] ?? [];
      const parsed     = applyColumnMap(rows, headers, columnMap, projectId);
      const now        = new Date().toISOString();
      setSchedule((prev) => ({
        ...prev,
        activities:    parsed,
        columnMap,
        lastUpdatedAt: now,
        uploadedAt:    now,
      }));
    },
    [projectId],
  );

  // ── Lookahead ─────────────────────────────────────────────────────────────

  const generateLookahead = useCallback(() => {
    const today  = new Date().toISOString().split("T")[0];
    const { messageBody } = generateWeeklyLookahead(activities, today);
    const msg: ScheduleMessage = {
      id:        makeMessageId(),
      projectId,
      type:      "lookahead",
      author:    "agent",
      body:      messageBody,
      status:    "pending",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
  }, [activities, projectId]);

  // ── Mark complete ─────────────────────────────────────────────────────────

  const markActivityComplete = useCallback(
    (activityId: string) => {
      const today     = new Date().toISOString().split("T")[0];
      const mutations = buildMarkCompleteProposal(activityId, activities, today);

      // Apply the mark_complete mutation immediately
      const primaryMutation = mutations.filter((m) => m.type === "mark_complete");
      setSchedule((prev) => ({
        ...prev,
        activities:    applyMutations(prev.activities, primaryMutation),
        lastUpdatedAt: new Date().toISOString(),
      }));

      const cascadeMutations = mutations.filter((m) => m.type !== "mark_complete");
      if (cascadeMutations.length > 0) {
        const proposalBody = buildCascadeProposalBody(mutations, activities);
        const proposal: ScheduleMessage = {
          id:        makeMessageId(),
          projectId,
          type:      "cascade_proposal",
          author:    "agent",
          body:      proposalBody,
          payload:   cascadeMutations,
          status:    "pending",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, proposal]);
      } else {
        const a = activities.find((x) => x.id === activityId);
        const confirmation: ScheduleMessage = {
          id:        makeMessageId(),
          projectId,
          type:      "confirmation",
          author:    "agent",
          body:      `✓ **${a?.name}** marked complete.`,
          status:    "confirmed",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, confirmation]);
      }
    },
    [activities, projectId],
  );

  // ── Push date ─────────────────────────────────────────────────────────────

  const pushActivity = useCallback(
    (activityId: string, days: number) => {
      const mutations    = buildPushDateProposal(activityId, days, activities);
      const proposalBody = buildCascadeProposalBody(mutations, activities);
      const proposal: ScheduleMessage = {
        id:        makeMessageId(),
        projectId,
        type:      "cascade_proposal",
        author:    "agent",
        body:      proposalBody,
        payload:   mutations,
        status:    "pending",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, proposal]);
    },
    [activities, projectId],
  );

  // ── Confirm / dismiss cascade ─────────────────────────────────────────────

  const confirmCascade = useCallback(
    (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg?.payload) return;

      setSchedule((prev) => ({
        ...prev,
        activities:    applyMutations(prev.activities, msg.payload!),
        lastUpdatedAt: new Date().toISOString(),
      }));

      const count = msg.payload.length;
      setMessages((prev) => [
        ...prev.map((m) => m.id === messageId ? { ...m, status: "confirmed" as const } : m),
        {
          id:        makeMessageId(),
          projectId,
          type:      "confirmation" as const,
          author:    "agent",
          body:      `✓ ${count} activit${count !== 1 ? "ies" : "y"} updated.`,
          status:    "confirmed" as const,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [messages, projectId],
  );

  const dismissCascade = useCallback(
    (messageId: string) => {
      setMessages((prev) =>
        prev.map((m) => m.id === messageId ? { ...m, status: "dismissed" as const } : m),
      );
    },
    [],
  );

  // ── Post free-text message ────────────────────────────────────────────────

  const postMessage = useCallback(
    (text: string) => {
      const userMsg: ScheduleMessage = {
        id:        makeMessageId(),
        projectId,
        type:      "user_update",
        author:    "user",
        body:      text,
        status:    "confirmed",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const intent = parseUserIntent(text, activities);

      if (intent.type === "mark_complete" && intent.activityId) {
        markActivityComplete(intent.activityId);
      } else if (intent.type === "push_date" && intent.activityId) {
        pushActivity(intent.activityId, intent.days ?? 7);
      }
      // add_note: user message is already posted, no agent action
    },
    [activities, projectId, markActivityComplete, pushActivity],
  );

  return {
    schedule,
    activities,
    messages,
    uploadSchedule,
    generateLookahead,
    markActivityComplete,
    pushActivity,
    confirmCascade,
    dismissCascade,
    postMessage,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/schedule/useSchedule.ts
git commit -m "feat(schedule): add useSchedule hook with state management"
```

---

## Task 7: ActivityList component

**Files:**
- Create: `src/components/schedule/ActivityList.tsx`

- [ ] **Step 1: Create `src/components/schedule/ActivityList.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, Circle, ChevronDown, ChevronRight } from "lucide-react";
import type { ScheduleActivity, ScheduleActivityStatus } from "@/lib/schedule/types";
import { formatDisplayDate } from "@/lib/schedule/utils";

const STATUS_CONFIG: Record<
  ScheduleActivityStatus,
  { label: string; icon: React.ReactNode; pill: string }
> = {
  complete: {
    label: "Complete",
    icon:  <CheckCircle2 size={12} className="text-status-success" />,
    pill:  "text-status-success bg-status-success/10 border-status-success/20",
  },
  active: {
    label: "Active",
    icon:  <Clock size={12} className="text-teal" />,
    pill:  "text-teal bg-teal/10 border-teal/20",
  },
  delayed: {
    label: "Delayed",
    icon:  <AlertTriangle size={12} className="text-status-warning" />,
    pill:  "text-status-warning bg-status-warning/10 border-status-warning/20",
  },
  upcoming: {
    label: "Upcoming",
    icon:  <Circle size={12} className="text-content-muted" />,
    pill:  "text-content-muted bg-surface-overlay border-surface-border",
  },
};

function groupByPhase(activities: ScheduleActivity[]): Record<string, ScheduleActivity[]> {
  return activities.reduce<Record<string, ScheduleActivity[]>>((acc, a) => {
    (acc[a.phase] ??= []).push(a);
    return acc;
  }, {});
}

function ActivityRow({ activity }: { activity: ScheduleActivity }) {
  const cfg = STATUS_CONFIG[activity.status];
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-t border-surface-border hover:bg-surface-overlay transition-colors">
      <div className="shrink-0">{cfg.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-content-primary truncate">{activity.name}</p>
        <p className="text-[11px] text-content-muted mt-0.5">
          {formatDisplayDate(activity.startDate)} – {formatDisplayDate(activity.endDate)}
          {activity.pushedDays && activity.pushedDays > 0
            ? <span className="ml-2 text-status-warning">+{activity.pushedDays}d</span>
            : null}
        </p>
      </div>
      <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wide ${cfg.pill}`}>
        {cfg.label}
      </span>
    </div>
  );
}

function PhaseGroup({ phase, activities }: { phase: string; activities: ScheduleActivity[] }) {
  const [open, setOpen] = useState(true);
  const completeCount = activities.filter((a) => a.status === "complete").length;

  return (
    <div className="border border-surface-border rounded-[var(--radius-card)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-surface-raised hover:bg-surface-overlay transition-colors text-left"
      >
        {open ? <ChevronDown size={13} className="text-content-muted" /> : <ChevronRight size={13} className="text-content-muted" />}
        <span className="text-[11px] font-bold uppercase tracking-widest text-content-secondary flex-1">
          {phase}
        </span>
        <span className="text-[11px] text-content-muted">
          {completeCount}/{activities.length}
        </span>
      </button>
      {open && (
        <div>
          {activities.map((a) => <ActivityRow key={a.id} activity={a} />)}
        </div>
      )}
    </div>
  );
}

export function ActivityList({ activities }: { activities: ScheduleActivity[] }) {
  const grouped = groupByPhase(activities);

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-content-muted">No schedule uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([phase, acts]) => (
        <PhaseGroup key={phase} phase={phase} activities={acts} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/schedule/ActivityList.tsx
git commit -m "feat(schedule): add ActivityList component grouped by phase"
```

---

## Task 8: CsvUploadPanel component

**Files:**
- Create: `src/components/schedule/CsvUploadPanel.tsx`

- [ ] **Step 1: Create `src/components/schedule/CsvUploadPanel.tsx`**

```tsx
"use client";

import React, { useState, useRef } from "react";
import { Upload, ArrowRight } from "lucide-react";
import type { ColumnMap } from "@/lib/schedule/types";
import { parseCSVText, detectColumnMap } from "@/lib/schedule/csv-parser";

const REQUIRED_FIELDS: Array<{ key: keyof ColumnMap; label: string; required: boolean }> = [
  { key: "activityName", label: "Activity Name", required: true  },
  { key: "phase",        label: "Phase",         required: true  },
  { key: "startDate",    label: "Start Date",    required: true  },
  { key: "endDate",      label: "End Date",      required: true  },
  { key: "duration",     label: "Duration",      required: false },
];

interface Props {
  projectId: string;
  onUpload:  (csvText: string, columnMap: ColumnMap) => void;
  onCancel:  () => void;
}

export function CsvUploadPanel({ onUpload, onCancel }: Props) {
  const [step,      setStep]      = useState<"upload" | "map">("upload");
  const [csvText,   setCsvText]   = useState("");
  const [headers,   setHeaders]   = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Partial<ColumnMap>>({});
  const [error,     setError]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file. Export your spreadsheet as CSV first.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSVText(text);
      if (rows.length < 2) {
        setError("The CSV appears to be empty or has no data rows.");
        return;
      }
      const detected = detectColumnMap(rows[0]);
      setCsvText(text);
      setHeaders(rows[0]);
      setColumnMap(detected);
      setStep("map");
      setError(null);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleConfirm() {
    const map = columnMap as ColumnMap;
    if (!map.activityName || !map.phase || !map.startDate || !map.endDate) {
      setError("Please map all required fields before importing.");
      return;
    }
    onUpload(csvText, map);
  }

  if (step === "upload") {
    return (
      <div className="p-6">
        <p className="text-sm font-semibold text-content-primary mb-1">Upload Project Schedule</p>
        <p className="text-xs text-content-muted mb-4">
          Export your schedule from Excel, Smartsheet, or Procore as a CSV, then upload here.
        </p>
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-surface-border-hover rounded-[var(--radius-card)] p-8 text-center cursor-pointer hover:border-teal/40 hover:bg-teal/5 transition-colors"
        >
          <Upload size={20} className="mx-auto mb-2 text-content-muted" />
          <p className="text-sm text-content-secondary font-medium">Drop CSV here or click to browse</p>
          <p className="text-xs text-content-muted mt-1">Excel → File → Save As → CSV</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {error && <p className="mt-3 text-xs text-status-critical">{error}</p>}
        <button onClick={onCancel} className="mt-4 text-xs text-content-muted hover:text-content-secondary">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <p className="text-sm font-semibold text-content-primary mb-1">Map Your Columns</p>
      <p className="text-xs text-content-muted mb-4">
        We detected {headers.length} columns. Map them to schedule fields below.
      </p>
      <div className="space-y-3">
        {REQUIRED_FIELDS.map(({ key, label, required }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-content-secondary w-32 shrink-0">
              {label}
              {required && <span className="text-status-critical ml-0.5">*</span>}
            </span>
            <select
              value={columnMap[key] ?? ""}
              onChange={(e) => setColumnMap((prev) => ({ ...prev, [key]: e.target.value || undefined }))}
              className="flex-1 text-xs bg-surface-raised border border-surface-border rounded px-2 py-1.5 text-content-primary focus:outline-none focus:border-teal/50"
            >
              <option value="">— select column —</option>
              {headers.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-xs text-status-critical">{error}</p>}
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={handleConfirm}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-teal text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          Import Schedule <ArrowRight size={13} />
        </button>
        <button onClick={() => setStep("upload")} className="text-xs text-content-muted hover:text-content-secondary">
          Back
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/schedule/CsvUploadPanel.tsx
git commit -m "feat(schedule): add CsvUploadPanel with drag-drop and column mapping"
```

---

## Task 9: Message card components

**Files:**
- Create: `src/components/schedule/LookaheadCard.tsx`
- Create: `src/components/schedule/CascadeProposalCard.tsx`
- Create: `src/components/schedule/ResourceAlertCard.tsx`

- [ ] **Step 1: Create `src/components/schedule/LookaheadCard.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, CheckCircle2, ArrowRight, StickyNote } from "lucide-react";
import type { ScheduleMessage } from "@/lib/schedule/types";
import type { ScheduleActivity } from "@/lib/schedule/types";
import { formatDisplayDate } from "@/lib/schedule/utils";

interface Props {
  message:            ScheduleMessage;
  week1Activities:    ScheduleActivity[];
  week2Activities:    ScheduleActivity[];
  week3Activities:    ScheduleActivity[];
  canAct:             boolean;
  onMarkComplete:     (activityId: string) => void;
  onPush:             (activityId: string, days: number) => void;
}

function ActivityChip({
  activity,
  weekIndex,
  canAct,
  onMarkComplete,
  onPush,
}: {
  activity:       ScheduleActivity;
  weekIndex:      number;
  canAct:         boolean;
  onMarkComplete: (id: string) => void;
  onPush:         (id: string, days: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-t border-teal/10 first:border-t-0">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-content-primary truncate">{activity.name}</p>
        <p className="text-[10px] text-content-muted">
          {activity.phase} · {formatDisplayDate(activity.startDate)}–{formatDisplayDate(activity.endDate)}
        </p>
      </div>
      {canAct && (
        <div className="flex items-center gap-1 shrink-0">
          {weekIndex === 0 && (
            <button
              onClick={() => onMarkComplete(activity.id)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-status-success border border-status-success/30 rounded hover:bg-status-success/10 transition-colors"
            >
              <CheckCircle2 size={9} /> Done
            </button>
          )}
          <button
            onClick={() => onPush(activity.id, 7)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-content-muted border border-surface-border rounded hover:border-status-warning/40 hover:text-status-warning transition-colors"
          >
            <ArrowRight size={9} /> Push
          </button>
        </div>
      )}
    </div>
  );
}

function WeekSection({
  label, activities, weekIndex, canAct, onMarkComplete, onPush,
}: {
  label:          string;
  activities:     ScheduleActivity[];
  weekIndex:      number;
  canAct:         boolean;
  onMarkComplete: (id: string) => void;
  onPush:         (id: string, days: number) => void;
}) {
  const [open, setOpen] = useState(weekIndex === 0);
  return (
    <div className="border border-teal/15 rounded-[var(--radius-card)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-teal/5 text-left"
      >
        {open ? <ChevronDown size={11} className="text-teal" /> : <ChevronRight size={11} className="text-teal" />}
        <span className="text-[10px] font-bold uppercase tracking-widest text-teal flex-1">{label}</span>
        <span className="text-[10px] text-content-muted">{activities.length} activit{activities.length !== 1 ? "ies" : "y"}</span>
      </button>
      {open && (
        <div className="px-3 pb-2">
          {activities.length === 0 ? (
            <p className="text-[10px] text-content-muted py-2">No activities scheduled.</p>
          ) : (
            activities.map((a) => (
              <ActivityChip
                key={a.id}
                activity={a}
                weekIndex={weekIndex}
                canAct={canAct}
                onMarkComplete={onMarkComplete}
                onPush={onPush}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function LookaheadCard({
  message, week1Activities, week2Activities, week3Activities, canAct, onMarkComplete, onPush,
}: Props) {
  return (
    <div className="bg-teal/5 border border-teal/20 rounded-[var(--radius-card)] p-3">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays size={13} className="text-teal" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-teal">3-Week Lookahead</span>
        <span className="ml-auto text-[10px] text-content-muted">
          {new Date(message.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
      <div className="space-y-2">
        <WeekSection label="Week 1 — This Week"  activities={week1Activities} weekIndex={0} canAct={canAct} onMarkComplete={onMarkComplete} onPush={onPush} />
        <WeekSection label="Week 2 — Next Week"  activities={week2Activities} weekIndex={1} canAct={canAct} onMarkComplete={onMarkComplete} onPush={onPush} />
        <WeekSection label="Week 3 — Forecasting" activities={week3Activities} weekIndex={2} canAct={canAct} onMarkComplete={onMarkComplete} onPush={onPush} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/schedule/CascadeProposalCard.tsx`**

```tsx
"use client";

import React from "react";
import { GitBranch, Check, X } from "lucide-react";
import type { ScheduleMessage } from "@/lib/schedule/types";

interface Props {
  message:    ScheduleMessage;
  onConfirm:  (messageId: string) => void;
  onDismiss:  (messageId: string) => void;
}

export function CascadeProposalCard({ message, onConfirm, onDismiss }: Props) {
  const isDone = message.status === "confirmed" || message.status === "dismissed";

  return (
    <div className={`border rounded-[var(--radius-card)] p-3 transition-opacity ${
      isDone ? "opacity-50 border-surface-border" : "border-blue-brand/30 bg-blue-brand/5"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <GitBranch size={12} className="text-blue-brand" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-brand">
          {isDone ? (message.status === "confirmed" ? "Changes Applied" : "Dismissed") : "Schedule Proposal"}
        </span>
      </div>
      <p className="text-[11px] text-content-secondary whitespace-pre-wrap leading-relaxed">
        {message.body}
      </p>
      {!isDone && (
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => onConfirm(message.id)}
            className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold bg-blue-brand text-white rounded hover:opacity-90 transition-opacity"
          >
            <Check size={10} /> Confirm
          </button>
          <button
            onClick={() => onDismiss(message.id)}
            className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold border border-surface-border text-content-muted rounded hover:border-surface-border-hover transition-colors"
          >
            <X size={10} /> Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/schedule/ResourceAlertCard.tsx`**

```tsx
"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import type { ScheduleMessage } from "@/lib/schedule/types";

export function ResourceAlertCard({ message }: { message: ScheduleMessage }) {
  return (
    <div className="bg-status-warning/5 border border-status-warning/25 rounded-[var(--radius-card)] p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <AlertTriangle size={12} className="text-status-warning" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-status-warning">Resource Alert</span>
        <span className="ml-auto text-[10px] text-content-muted">
          {new Date(message.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
      <p className="text-[11px] text-content-secondary whitespace-pre-wrap leading-relaxed">
        {message.body}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/schedule/LookaheadCard.tsx src/components/schedule/CascadeProposalCard.tsx src/components/schedule/ResourceAlertCard.tsx
git commit -m "feat(schedule): add message card components (lookahead, cascade proposal, resource alert)"
```

---

## Task 10: ScheduleChat component

**Files:**
- Create: `src/components/schedule/ScheduleChat.tsx`

- [ ] **Step 1: Create `src/components/schedule/ScheduleChat.tsx`**

```tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, RefreshCw } from "lucide-react";
import type { ScheduleMessage, ScheduleActivity } from "@/lib/schedule/types";
import { LookaheadCard }       from "./LookaheadCard";
import { CascadeProposalCard } from "./CascadeProposalCard";
import { ResourceAlertCard }   from "./ResourceAlertCard";
import { getWeekBuckets }      from "@/lib/schedule/utils";

interface Props {
  messages:           ScheduleMessage[];
  activities:         ScheduleActivity[];
  canAct:             boolean;
  onPostMessage:      (text: string) => void;
  onMarkComplete:     (activityId: string) => void;
  onPush:             (activityId: string, days: number) => void;
  onConfirmCascade:   (messageId: string) => void;
  onDismissCascade:   (messageId: string) => void;
  onGenerateLookahead: () => void;
}

function ConfirmationBubble({ message }: { message: ScheduleMessage }) {
  return (
    <div className="flex justify-start">
      <p className="text-[11px] text-content-muted italic">{message.body}</p>
    </div>
  );
}

function UserBubble({ message }: { message: ScheduleMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-surface-raised border border-surface-border rounded-[var(--radius-card)] px-3 py-2">
        <p className="text-[12px] text-content-primary">{message.body}</p>
        <p className="text-[10px] text-content-muted mt-1 text-right">
          {new Date(message.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export function ScheduleChat({
  messages, activities, canAct,
  onPostMessage, onMarkComplete, onPush,
  onConfirmCascade, onDismissCascade, onGenerateLookahead,
}: Props) {
  const [input,    setInput]    = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const today     = new Date().toISOString().split("T")[0];
  const buckets   = getWeekBuckets(activities, today);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onPostMessage(text);
    setInput("");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border shrink-0">
        <Bot size={14} className="text-teal" />
        <span className="text-xs font-semibold text-content-primary">Schedule Chat</span>
        {canAct && (
          <button
            onClick={onGenerateLookahead}
            title="Generate this week's lookahead"
            className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-content-muted border border-surface-border rounded px-2 py-1 hover:border-teal/40 hover:text-teal transition-colors"
          >
            <RefreshCw size={10} /> Weekly Update
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-content-muted text-center mt-8">
            No messages yet. Generate a weekly update to start.
          </p>
        )}
        {messages.map((msg) => {
          if (msg.type === "lookahead") {
            return (
              <LookaheadCard
                key={msg.id}
                message={msg}
                week1Activities={buckets[0]?.activities ?? []}
                week2Activities={buckets[1]?.activities ?? []}
                week3Activities={buckets[2]?.activities ?? []}
                canAct={canAct}
                onMarkComplete={onMarkComplete}
                onPush={onPush}
              />
            );
          }
          if (msg.type === "resource_alert") {
            return <ResourceAlertCard key={msg.id} message={msg} />;
          }
          if (msg.type === "cascade_proposal") {
            return (
              <CascadeProposalCard
                key={msg.id}
                message={msg}
                onConfirm={onConfirmCascade}
                onDismiss={onDismissCascade}
              />
            );
          }
          if (msg.type === "user_update") {
            return <UserBubble key={msg.id} message={msg} />;
          }
          if (msg.type === "confirmation") {
            return <ConfirmationBubble key={msg.id} message={msg} />;
          }
          return null;
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-surface-border shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Update the schedule — e.g. 'Formwork is done' or 'Push rebar out a week'"
          className="flex-1 text-xs bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-teal/50"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-teal text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/schedule/ScheduleChat.tsx
git commit -m "feat(schedule): add ScheduleChat component with message rendering and input"
```

---

## Task 11: ScheduleTab two-pane layout

**Files:**
- Create: `src/components/schedule/ScheduleTab.tsx`

- [ ] **Step 1: Create `src/components/schedule/ScheduleTab.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { Upload, List, MessageSquare } from "lucide-react";
import { useSchedule }     from "@/hooks/schedule/useSchedule";
import { ActivityList }    from "./ActivityList";
import { ScheduleChat }    from "./ScheduleChat";
import { CsvUploadPanel }  from "./CsvUploadPanel";
import type { UserRole }   from "@/types/org";

const SCHEDULE_ACTING_ROLES: UserRole[] = ["owner", "admin", "pm", "project_engineer", "superintendent"];

interface Props {
  projectId: string;
  role:      UserRole;
}

export function ScheduleTab({ projectId, role }: Props) {
  const {
    schedule, activities, messages,
    uploadSchedule, generateLookahead,
    markActivityComplete, pushActivity,
    confirmCascade, dismissCascade, postMessage,
  } = useSchedule(projectId);

  const [showUpload,  setShowUpload]  = useState(false);
  const [mobileTab,   setMobileTab]   = useState<"chat" | "schedule">("chat");

  const canAct = SCHEDULE_ACTING_ROLES.includes(role);
  const canUpload = (["owner", "admin", "pm", "project_engineer"] as UserRole[]).includes(role);

  const chatProps = {
    messages,
    activities,
    canAct,
    onPostMessage:       postMessage,
    onMarkComplete:      markActivityComplete,
    onPush:              pushActivity,
    onConfirmCascade:    confirmCascade,
    onDismissCascade:    dismissCascade,
    onGenerateLookahead: generateLookahead,
  };

  if (showUpload) {
    return (
      <div className="max-w-lg mx-auto mt-6">
        <div className="border border-surface-border rounded-[var(--radius-card)] overflow-hidden">
          <CsvUploadPanel
            projectId={projectId}
            onUpload={(text, map) => { uploadSchedule(text, map); setShowUpload(false); }}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <p className="text-xs text-content-muted flex-1">
          {activities.length} activities · last updated{" "}
          {new Date(schedule.lastUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </p>
        {canUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-content-muted border border-surface-border rounded-lg px-3 py-1.5 hover:border-teal/40 hover:text-teal transition-colors"
          >
            <Upload size={11} /> Update Schedule
          </button>
        )}
        {/* Mobile tab switcher */}
        <div className="flex lg:hidden border border-surface-border rounded-lg overflow-hidden">
          <button
            onClick={() => setMobileTab("chat")}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors ${
              mobileTab === "chat"
                ? "bg-teal text-white"
                : "text-content-muted hover:text-content-secondary"
            }`}
          >
            <MessageSquare size={11} /> Chat
          </button>
          <button
            onClick={() => setMobileTab("schedule")}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors ${
              mobileTab === "schedule"
                ? "bg-teal text-white"
                : "text-content-muted hover:text-content-secondary"
            }`}
          >
            <List size={11} /> Schedule
          </button>
        </div>
      </div>

      {/* Desktop: two-pane */}
      <div className="hidden lg:grid lg:grid-cols-5 gap-4 flex-1 min-h-0">
        <div className="lg:col-span-2 overflow-y-auto">
          <ActivityList activities={activities} />
        </div>
        <div className="lg:col-span-3 border border-surface-border rounded-[var(--radius-card)] overflow-hidden">
          <ScheduleChat {...chatProps} />
        </div>
      </div>

      {/* Mobile: tab-switched */}
      <div className="lg:hidden flex-1 min-h-0">
        {mobileTab === "schedule" ? (
          <div className="overflow-y-auto h-full">
            <ActivityList activities={activities} />
          </div>
        ) : (
          <div className="border border-surface-border rounded-[var(--radius-card)] overflow-hidden h-full">
            <ScheduleChat {...chatProps} />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/schedule/ScheduleTab.tsx
git commit -m "feat(schedule): add ScheduleTab two-pane layout with mobile tab switching"
```

---

## Task 12: Wire into project command center

**Files:**
- Modify: `src/app/(shell)/projects/[projectId]/client.tsx`

- [ ] **Step 1: Add imports to client.tsx**

At the top of `src/app/(shell)/projects/[projectId]/client.tsx`, add to the existing imports:

```typescript
import { ScheduleTab } from "@/components/schedule/ScheduleTab";
```

- [ ] **Step 2: Add tab state to `ProjectCommandCenterClient`**

Inside `ProjectCommandCenterClient`, after the existing data filtering logic and before the `return`, add:

```typescript
  const [activeTab, setActiveTab] = useState<"overview" | "schedule">("overview");
```

Also add `useState` to the React import if not already there (it will already be imported since this is a client component that uses `useState` for role CTA — check the existing imports and add if needed).

- [ ] **Step 3: Add tab bar and conditional render to the return statement**

Replace the opening of the `return` statement in `ProjectCommandCenterClient`. The existing return starts with `<PageContainer maxWidth="wide">`. After the breadcrumb and project header card and before the `<RoleCTABar />`, add the tab bar:

```tsx
      {/* ── Tab Bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-4 border-b border-surface-border">
        {(["overview", "schedule"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-gold text-content-primary"
                : "border-transparent text-content-muted hover:text-content-secondary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
```

Then wrap the existing content (RoleCTABar + main grid) in a conditional:

```tsx
      {activeTab === "overview" && (
        <>
          <RoleCTABar projectId={projectId} />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* ... existing left + right columns ... */}
          </div>
        </>
      )}

      {activeTab === "schedule" && (
        <ScheduleTab projectId={projectId} role={role} />
      )}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/(shell)/projects/[projectId]/client.tsx
git commit -m "feat(schedule): wire ScheduleTab into project command center with Overview/Schedule tabs"
```

---

## Task 13: Browser verification

- [ ] **Step 1: Start dev server**

```bash
cd /Users/tui/aigacp && npm run dev
```

- [ ] **Step 2: Navigate to a project**

Go to `/projects/proj_highland_002`.

Expected: "Overview" and "Schedule" tab bar visible below the project header.

- [ ] **Step 3: Verify Schedule tab loads with mock data**

Click "Schedule" tab.

Expected:
- Activity list on left (desktop) showing Foundation and Structural phases, grouped and collapsible
- Chat on right showing the seeded lookahead message (3-week card, Week 1 expanded by default) and the resource alert (amber, "Crew gap — Week 2")
- "Formwork Level B1" shows as "Active", "Excavation" as "Complete"

- [ ] **Step 4: Test quick-action Done button**

In the Week 1 section of the lookahead card, find "Formwork Level B1". Click Done.

Expected:
- "Formwork Level B1" status changes to "Complete" in the activity list
- A cascade_proposal card appears in the chat proposing to pull "Rebar Installation B1" and "Concrete Pour B1" forward (since formwork is finishing early)

- [ ] **Step 5: Confirm cascade proposal**

Click "Confirm" on the cascade proposal card.

Expected:
- Proposal card shows "Changes Applied" (dimmed)
- "Rebar Installation B1" and "Concrete Pour B1" dates update in the activity list
- A "✓ 2 activities updated." confirmation message appears in chat

- [ ] **Step 6: Test free-text input**

Type "rebar is done" in the chat input and send.

Expected:
- User message bubble appears right-aligned
- Agent interprets "done" + "rebar" → marks "Rebar Installation B1" complete
- If it was early, a cascade proposal for Concrete Pour B1 appears

- [ ] **Step 7: Test Push flow**

Click the "Push" button on any Week 2 activity chip in the lookahead card.

Expected:
- A cascade proposal appears proposing to push the activity and all downstream activities by 7 days
- Confirm → dates update in activity list

- [ ] **Step 8: Test CSV upload flow**

Click "Update Schedule". Drop or select any CSV file with at least columns for task name, start date, end date.

Expected:
- Column mapping screen appears with dropdowns pre-filled based on detected column names
- After mapping and clicking Import, the activity list resets to the imported activities

- [ ] **Step 9: Test mobile layout**

Resize browser to mobile width (< 1024px).

Expected:
- "Chat" and "Schedule" toggle buttons appear in the toolbar
- Chat tab (default) shows the full-width chat thread
- Schedule tab shows the full-width activity list
- Desktop two-pane layout is hidden

- [ ] **Step 10: Test role access**

Switch role to "foreman" via the role switcher in the topbar.

Expected:
- "Update Schedule" upload button is NOT visible (foreman cannot upload)
- Quick-action Done/Push buttons in lookahead card are NOT visible (foreman is not in `SCHEDULE_ACTING_ROLES`)
- Schedule tab and activity list are still visible (read access)
- "Weekly Update" button in chat header is NOT visible

---

## Self-Review

**Spec coverage:**
- ✅ Schedule tab on project page
- ✅ CSV upload with column mapping step
- ✅ Activity list grouped by phase, status badges
- ✅ Chat thread with agent messages
- ✅ 3-week rolling lookahead card (Week 1/2/3 with collapsible sections)
- ✅ Resource alert message type
- ✅ Cascade proposals with Confirm / Dismiss
- ✅ Free-text input with intent parsing (mark_complete, push_date, add_note)
- ✅ Quick-action chips (Done / Push) on activity chips in lookahead card
- ✅ Mobile chat-first layout with tab switching
- ✅ Role access: foreman read-only, supe/PM can act, pm/engineer can upload
- ✅ Feature flag: `features.schedule.ai_agent` added to org config
- ✅ Mock data pre-populated with realistic Highland Tower activities and seed messages
- ⏳ Cross-module reads (CRU/MX/OPS/Inspect) — Phase 3 follow-up plan
- ⏳ Gantt export — Phase 4 follow-up plan
- ⏳ Weekly cron + real Claude API — Phase 5

**Type consistency:**
- `ScheduleActivity.id` used consistently across all files (`sa_001` format in mock, `sched_imported_N` for CSV imports)
- `ScheduleMessage.id` (`smsg_001` in mock, `smsg_N` via `makeMessageId()` counter for runtime)
- `MutationType` union matches usage in `applyMutations`, `buildMarkCompleteProposal`, `buildPushDateProposal`
- `ColumnMap` keys match `REQUIRED_FIELDS` array in `CsvUploadPanel`
- `canAct` prop flows consistently from `ScheduleTab` → `ScheduleChat` → `LookaheadCard`

**No placeholders:** All code blocks are complete and reference only types/functions defined in this plan or the existing codebase.
