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
