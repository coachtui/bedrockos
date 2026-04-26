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
    body: "**Crew gap — Week 3:** Steel Erection Level 1 starts May 5. You currently have 2 ironworkers assigned to this project. Structural steel typically requires 4–6. Consider requesting additional crew from the pool before end of this week.",
  },
];
