/**
 * CRU Integration Adapter
 *
 * Platform-side service that provides OPS (and other consumers) with
 * workforce and event data from CRU.
 *
 * All calls go through the local server proxy at /api/cru/ops, which
 * forwards to CRU's ops-api edge function using a trusted internal API key.
 * The key lives in server env vars and is never exposed to the browser.
 *
 * On any failure (proxy not configured, CRU unavailable, network error)
 * each function falls back to mock data — preserving current UX with no crashes.
 *
 * ── Activation checklist ──────────────────────────────────────────────────────
 * 1. Set in .env.local:
 *      CRU_SUPABASE_URL=https://<project>.supabase.co
 *      CRU_OPS_INTERNAL_API_KEY=<secret>
 *    The secret must match OPS_INTERNAL_API_KEY in CRU Supabase Secrets.
 *
 * 2. Redeploy CRU's ops-api edge function with verify_jwt = false in its
 *    config.toml (already committed in crewai-command).
 *
 * No page components need to change — the adapter handles both paths.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Responsibility split:
 *   CRU  → workforce / resource / schedule source of truth
 *   OPS  → orchestration consumer — reads from here, never writes CRU tables
 */

import type { RequestType } from "@/lib/ops/types";

// ── Exported types ────────────────────────────────────────────────────────────

export interface CruWorker {
  id:        string;
  name:      string;
  /** Role as defined in CRU: mechanic | driver | mason | foreman | superintendent */
  role:      string;
  siteId?:   string;
  siteName?: string;
  available: boolean;
}

export interface CruSiteEvent {
  id:            string;
  siteId:        string;
  siteName:      string;
  eventType:     string;
  date:          string;
  status:        "planned" | "confirmed" | "completed";
  /** Pour-specific fields — present only when the event carries pour data */
  yardage?:      number;
  pumpRequired?: boolean;
  crewId?:       string;
  crewName?:     string;
}

// ── Integration seam — OPS request type → CRU worker role ────────────────────
// Single source of truth for the OPS ↔ CRU role mapping.
// Update here when CRU adds or renames roles.

export const OPS_REQUEST_TO_CRU_ROLE: Record<RequestType, string> = {
  mason:      "mason",
  pump_truck: "driver",
  equipment:  "mechanic",
  manpower:   "laborer",
};

// ── DB response shapes (ops-api SELECT columns) ───────────────────────────────

interface DbWorker {
  id:                  string;
  name:                string;
  role:                string;
  availability_status: string;
  job_site_id:         string | null;
  job_site:            { id: string; name: string } | null;
}

interface DbSiteEvent {
  id:          string;
  title:       string;
  event_date:  string;
  event_type:  string;
  start_time:  string | null;
  location:    string | null;
  job_site_id: string | null;
  job_site:    { id: string; name: string } | null;
}

interface DbAssignment {
  id:            string;
  worker_id:     string;
  job_site_id:   string | null;
  assigned_date: string;
  status:        string;
  worker:        { id: string; name: string; role: string; job_site_id: string | null } | null;
  task:          {
    id:          string;
    name:        string;
    job_site_id: string | null;
    job_site:    { id: string; name: string } | null;
  } | null;
}

// ── Shape transformers ────────────────────────────────────────────────────────

function dbWorkerToCruWorker(w: DbWorker): CruWorker {
  return {
    id:        w.id,
    name:      w.name,
    role:      w.role,
    siteId:    w.job_site_id ?? undefined,
    siteName:  w.job_site?.name,
    available: w.availability_status === "available",
  };
}

function dbSiteEventToCruSiteEvent(e: DbSiteEvent): CruSiteEvent {
  return {
    id:        e.id,
    siteId:    e.job_site_id ?? e.id,
    siteName:  e.job_site?.name ?? e.title,
    eventType: e.event_type,
    date:      e.event_date,
    // The site_events table does not carry status / pour-specific fields.
    // Events arrive as "planned" by default; pour detail fields are absent.
    status:    "planned",
  };
}

function dbAssignmentToCruSiteEvent(a: DbAssignment): CruSiteEvent {
  return {
    id:        a.id,
    siteId:    a.job_site_id ?? a.id,
    siteName:  a.task?.job_site?.name ?? "Unknown Site",
    eventType: "assignment",
    date:      a.assigned_date,
    status:    "planned",
  };
}

// ── Core fetch helper ─────────────────────────────────────────────────────────
// Posts to the local AIGACP proxy. No secrets in client code.

async function cruPost<T>(body: Record<string, unknown>): Promise<T> {
  const res  = await fetch("/api/cru/ops", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  const data = await res.json() as { success?: boolean; data?: T; error?: string };

  if (!res.ok || !data.success) {
    throw new Error(`[cru] ${data.error ?? `HTTP ${res.status}`}`);
  }
  return data.data as T;
}

// ── Mock CRU workforce (Phase 1–2 fallback) ───────────────────────────────────
// Returned whenever cruPost() throws for any reason.

const MOCK_CRU_WORKERS: CruWorker[] = [
  // Mechanics
  { id: "cru_w_001", name: "Tony Reeves",    role: "mechanic",       siteId: "proj_highland_002", siteName: "Highland Tower — Phase 2",    available: true  },
  { id: "cru_w_002", name: "Derek Walsh",    role: "mechanic",       siteId: "proj_eastside_007", siteName: "Eastside Medical Campus",      available: true  },
  { id: "cru_w_003", name: "Carlos Mejia",   role: "mechanic",                                                                              available: true  },
  { id: "cru_w_004", name: "Priya Nair",     role: "mechanic",                                                                              available: false },

  // Drivers
  { id: "cru_w_005", name: "Marco Ruiz",     role: "driver",         siteId: "proj_riverside_003", siteName: "Riverside District Parking",  available: true  },
  { id: "cru_w_006", name: "Jean Lafleur",   role: "driver",                                                                                available: true  },
  { id: "cru_w_007", name: "Kenji Tanaka",   role: "driver",                                                                                available: false },

  // Masons
  { id: "cru_w_008", name: "Luis Torres",    role: "mason",          siteId: "proj_highland_002", siteName: "Highland Tower — Phase 2",    available: true  },
  { id: "cru_w_009", name: "Ahmed Siddiqui", role: "mason",                                                                                 available: true  },
  { id: "cru_w_010", name: "Bruno Costa",    role: "mason",                                                                                 available: false },

  // Foremen / Superintendents
  { id: "cru_w_011", name: "Marcus Jimenez", role: "foreman",        siteId: "proj_highland_002", siteName: "Highland Tower — Phase 2",    available: true  },
  { id: "cru_w_012", name: "Carmen Nguyen",  role: "superintendent", siteId: "proj_oakridge_001", siteName: "Oakridge Industrial Complex", available: true  },
];

const MOCK_CRU_SITE_EVENTS: CruSiteEvent[] = [
  {
    id:           "cru_evt_001",
    siteId:       "proj_highland_002",
    siteName:     "Highland Tower — Phase 2",
    eventType:    "pour",
    date:         "2026-04-16",
    yardage:      280,
    pumpRequired: true,
    crewId:       "crew_001",
    crewName:     "Structural Crew T-3",
    status:       "planned",
  },
  {
    id:           "cru_evt_002",
    siteId:       "proj_oakridge_001",
    siteName:     "Oakridge Industrial Complex",
    eventType:    "pour",
    date:         "2026-04-17",
    yardage:      145,
    pumpRequired: false,
    crewId:       "crew_004",
    crewName:     "Foundation Crew F-1",
    status:       "confirmed",
  },
  {
    id:           "cru_evt_003",
    siteId:       "proj_meridian_003",
    siteName:     "Meridian Bridge Rehab",
    eventType:    "pour",
    date:         "2026-04-18",
    yardage:      60,
    pumpRequired: false,
    crewName:     "Bridge Crew B-2",
    status:       "planned",
  },
];

// ── Integration functions ─────────────────────────────────────────────────────

export async function getCruWorkersForOrg(
  orgId:   string,
  siteId?: string,
): Promise<CruWorker[]> {
  try {
    const workers = await cruPost<DbWorker[]>({ action: "getWorkersForOrg", orgId, siteId });
    return workers.map(dbWorkerToCruWorker);
  } catch {
    return siteId
      ? MOCK_CRU_WORKERS.filter((w) => !w.siteId || w.siteId === siteId)
      : MOCK_CRU_WORKERS;
  }
}

export async function getCruWorkersByRole(
  orgId: string,
  role:  string,
): Promise<CruWorker[]> {
  try {
    const workers = await cruPost<DbWorker[]>({ action: "getWorkersByRole", orgId, role });
    return workers.map(dbWorkerToCruWorker);
  } catch {
    return MOCK_CRU_WORKERS.filter((w) => w.role === role);
  }
}

export async function getCruAvailableWorkersByRole(
  orgId:               string,
  role:                string,
  availabilityStatus?: boolean,
): Promise<CruWorker[]> {
  try {
    // Convert boolean (legacy mock signature) to the string the edge function expects.
    // undefined → 'available' (edge function default); false → 'unavailable'.
    const statusStr = availabilityStatus === false ? "unavailable" : "available";
    const workers = await cruPost<DbWorker[]>({
      action:             "getAvailableWorkersByRole",
      orgId,
      role,
      availabilityStatus: statusStr,
    });
    return workers.map(dbWorkerToCruWorker);
  } catch {
    const available = availabilityStatus ?? true;
    return MOCK_CRU_WORKERS.filter((w) => w.role === role && w.available === available);
  }
}

export async function getCruMechanicsAndDrivers(orgId: string): Promise<CruWorker[]> {
  try {
    const workers = await cruPost<DbWorker[]>({ action: "getMechanicsAndDrivers", orgId });
    return workers.map(dbWorkerToCruWorker);
  } catch {
    return MOCK_CRU_WORKERS.filter((w) => w.role === "mechanic" || w.role === "driver");
  }
}

export async function getCruAssignmentsInDateRange(
  orgId:     string,
  startDate: string,
  endDate:   string,
  siteId?:   string,
): Promise<CruSiteEvent[]> {
  try {
    const assignments = await cruPost<DbAssignment[]>({
      action: "getAssignmentsInDateRange",
      orgId,
      startDate,
      endDate,
      siteId,
    });
    return assignments.map(dbAssignmentToCruSiteEvent);
  } catch {
    return MOCK_CRU_SITE_EVENTS.filter((e) => {
      const inRange = e.date >= startDate && e.date <= endDate;
      return inRange && (!siteId || e.siteId === siteId);
    });
  }
}

export async function getCruWorkerActiveAssignments(
  workerId: string,
  fromDate: string,
): Promise<CruSiteEvent[]> {
  // NOTE: ops-api requires orgId at the gateway level but this function receives
  // only workerId. The real call will be rejected (400) until this signature is
  // updated to include orgId. Mock returns [] matching prior behavior.
  try {
    const assignments = await cruPost<DbAssignment[]>({
      action:   "getWorkerActiveAssignments",
      workerId,
      fromDate,
    });
    return assignments.map(dbAssignmentToCruSiteEvent);
  } catch {
    return [];
  }
}

export async function getCruSiteEventsForOrg(
  orgId:      string,
  startDate:  string,
  endDate:    string,
  eventType?: string,
): Promise<CruSiteEvent[]> {
  try {
    const events = await cruPost<DbSiteEvent[]>({
      action: "getSiteEventsForOrg",
      orgId,
      startDate,
      endDate,
      eventType,
    });
    return events.map(dbSiteEventToCruSiteEvent);
  } catch {
    let events = MOCK_CRU_SITE_EVENTS.filter(
      (e) => e.date >= startDate && e.date <= endDate,
    );
    if (eventType) events = events.filter((e) => e.eventType === eventType);
    return events;
  }
}
