import type { ScheduleActivity, WeekBucket } from "./types";

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

export function diffDays(laterDate: string, earlierDate: string): number {
  const a = new Date(laterDate).getTime();
  const b = new Date(earlierDate).getTime();
  return Math.round((a - b) / 86_400_000);
}

export function startOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
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
