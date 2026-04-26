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
