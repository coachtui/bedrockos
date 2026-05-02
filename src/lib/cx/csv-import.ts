import type { CreateCxTaskInput, CxTaskType, CxTaskStatus } from "./types";

export interface ColumnMapping {
  name:        number | null;
  type:        number | null;
  startDate:   number | null;
  endDate:     number | null;
  location:    number | null;
  status:      number | null;
  notes:       number | null;
  externalId:  number | null;
}

export const EMPTY_MAPPING: ColumnMapping = {
  name: null, type: null, startDate: null, endDate: null,
  location: null, status: null, notes: null, externalId: null,
};

export const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  name:       "Task Name",
  type:       "Type",
  startDate:  "Start Date",
  endDate:    "End Date",
  location:   "Location",
  status:     "Status",
  notes:      "Notes",
  externalId: "Task ID",
};

const TASK_TYPE_VALUES = new Set<CxTaskType>([
  "pour", "inspection", "delivery", "grading", "concrete", "framing",
  "electrical", "excavation", "utility", "paving", "demolition", "other",
]);

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
    name:       /name|task.?name|description|title/i,
    type:       /type|task.?type|work.?type|category/i,
    startDate:  /start.?date|start|begin|from/i,
    endDate:    /end.?date|end|finish|to/i,
    location:   /location|loc|area|zone|grid/i,
    status:     /status/i,
    notes:      /notes?|comments?|remarks?/i,
    externalId: /task.?id|id|ref|reference|ext/i,
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

function coerceType(raw: string): CxTaskType {
  const normalized = raw.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (TASK_TYPE_VALUES.has(normalized as CxTaskType)) return normalized as CxTaskType;
  const typeMap: Record<string, CxTaskType> = {
    concrete_work: "concrete",
    utility_work:  "utility",
    site_work:     "grading",
    demo:          "demolition",
    elec:          "electrical",
  };
  return typeMap[normalized] ?? "other";
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
  return undefined;
}

export function mapRowsToTasks(
  rows:      string[][],
  mapping:   ColumnMapping,
  projectId: string,
): CreateCxTaskInput[] {
  return rows
    .filter((row) => {
      const nameIdx = mapping.name;
      return nameIdx !== null && row[nameIdx]?.trim();
    })
    .map((row) => {
      const get = (idx: number | null) => (idx !== null ? (row[idx] ?? "") : "");
      return {
        projectId,
        name:              get(mapping.name).trim(),
        type:              mapping.type   !== null ? coerceType(get(mapping.type))     : "other",
        startDate:         coerceDate(get(mapping.startDate)),
        endDate:           coerceDate(get(mapping.endDate)),
        location:          get(mapping.location).trim()   || undefined,
        status:            mapping.status !== null ? coerceStatus(get(mapping.status)) : "not_started",
        notes:             get(mapping.notes).trim()      || undefined,
        externalId:        get(mapping.externalId).trim() || undefined,
        crewRequirements:  [],
        assignedWorkerIds: [],
      };
    });
}

export const CSV_TEMPLATE_HEADER =
  "task_id,name,type,start_date,end_date,location,status,notes";

export const CSV_TEMPLATE_EXAMPLE =
  `${CSV_TEMPLATE_HEADER}\nTK-001,North Wall Pour,pour,2026-05-15,2026-05-15,Grid B-4,not_started,\nTK-002,Foundation Inspection,inspection,,,South Wing,not_started,\nTK-003,Utility Trenching,utility,2026-05-20,2026-05-24,Zone C,,Coordinate with city inspector`;
