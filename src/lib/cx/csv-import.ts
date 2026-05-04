import type { CreateCxTaskInput, CxTaskStatus } from "./types";

export interface ColumnMapping {
  activityId:        number | null;
  activityName:      number | null;
  start:             number | null;
  finish:            number | null;
  originalDuration:  number | null;
  remainingDuration: number | null;
  predecessors:      number | null;
  successors:        number | null;
}

export const EMPTY_MAPPING: ColumnMapping = {
  activityId: null, activityName: null, start: null, finish: null,
  originalDuration: null, remainingDuration: null, predecessors: null, successors: null,
};

export const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  activityId:        "Activity ID",
  activityName:      "Activity Name",
  start:             "Start",
  finish:            "Finish",
  originalDuration:  "Original Duration",
  remainingDuration: "Remaining Duration",
  predecessors:      "Predecessors",
  successors:        "Successors",
};

const STATUS_VALUES = new Set<CxTaskStatus>([
  "not_started", "in_progress", "on_hold", "complete",
]);

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSVText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows    = lines.slice(1).map(parseCSVLine);
  return { headers, rows };
}

export function detectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { ...EMPTY_MAPPING };
  const patterns: Record<keyof ColumnMapping, RegExp> = {
    activityId:        /activity.?id|act.?id|wbs|task.?id|id/i,
    activityName:      /activity.?name|act.?name|name|description|task.?name|title/i,
    start:             /start.?date|start|begin|es|early.?start/i,
    finish:            /finish.?date|finish|end|ef|early.?finish/i,
    originalDuration:  /orig.?dur|original.?dur|od|planned.?dur|baseline.?dur/i,
    remainingDuration: /rem.?dur|remaining.?dur|rd/i,
    predecessors:      /pred|predecessor/i,
    successors:        /succ|successor/i,
  };
  headers.forEach((h, i) => {
    (Object.keys(patterns) as Array<keyof ColumnMapping>).forEach((field) => {
      if (mapping[field] === null && patterns[field].test(h)) {
        mapping[field] = i;
      }
    });
  });
  return mapping;
}

function coerceStatus(raw: string): CxTaskStatus {
  const normalized = raw.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (STATUS_VALUES.has(normalized as CxTaskStatus)) return normalized as CxTaskStatus;
  const statusMap: Record<string, CxTaskStatus> = {
    scheduled:  "not_started",
    pending:    "not_started",
    active:     "in_progress",
    done:       "complete",
    completed:  "complete",
  };
  return statusMap[normalized] ?? "not_started";
}

function coerceDate(raw: string): string | undefined {
  if (!raw) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Handle "DD-MMM-YY" or "DD-MMM-YYYY" (common P6 export format)
  const p6 = raw.match(/^(\d{1,2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2,4})$/i);
  if (p6) {
    const monthMap: Record<string, string> = {
      jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",
      jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12",
    };
    const [, d, mon, y] = p6;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${monthMap[mon.toLowerCase()]}-${d.padStart(2, "0")}`;
  }
  return undefined;
}

function parseDependencies(raw: string): string[] {
  if (!raw.trim()) return [];
  return raw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
}

function parseDuration(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const n = parseInt(raw.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? undefined : n;
}

export function mapRowsToTasks(
  rows:      string[][],
  mapping:   ColumnMapping,
  projectId: string,
): CreateCxTaskInput[] {
  return rows
    .filter((row) => {
      const nameIdx = mapping.activityName;
      return nameIdx !== null && row[nameIdx]?.trim();
    })
    .map((row) => {
      const get = (idx: number | null) => (idx !== null ? (row[idx] ?? "") : "");
      return {
        projectId,
        name:              get(mapping.activityName).trim(),
        type:              "other" as const,
        startDate:         coerceDate(get(mapping.start)),
        endDate:           coerceDate(get(mapping.finish)),
        status:            "not_started" as const,
        crewRequirements:  [],
        assignedWorkerIds: [],
        externalId:        get(mapping.activityId).trim()  || undefined,
        originalDuration:  parseDuration(get(mapping.originalDuration)),
        remainingDuration: parseDuration(get(mapping.remainingDuration)),
        predecessors:      parseDependencies(get(mapping.predecessors)),
        successors:        parseDependencies(get(mapping.successors)),
      };
    });
}

export const CSV_TEMPLATE_HEADER =
  "activity_id,activity_name,start,finish,original_duration,remaining_duration,predecessors,successors";

export const CSV_TEMPLATE_EXAMPLE =
  `${CSV_TEMPLATE_HEADER}
A1000,Mobilization,2026-05-01,2026-05-03,3,3,,A1010
A1010,Excavation - Zone A,2026-05-04,2026-05-10,5,5,A1000,A1020;A1030
A1020,Footing Formwork,2026-05-11,2026-05-13,3,3,A1010,A1040
A1030,Underground Utilities,2026-05-11,2026-05-17,5,5,A1010,A1040
A1040,Concrete Pour - Footings,2026-05-18,2026-05-18,1,1,A1020;A1030,`;
