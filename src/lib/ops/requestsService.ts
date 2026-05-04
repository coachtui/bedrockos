/**
 * requestsService — localStorage-backed repository for OPS dispatch requests.
 *
 * Same seam-based pattern as poursService.ts. To migrate to Supabase:
 * replace load() and persist() with async fetch/upsert calls and update
 * OpsProvider to await them (or use React Query mutations).
 *
 * SEED_REQUESTS includes a pump truck request linked to pour_001 (the
 * pre-approved seed pour) so that the DispatchStatus component shows
 * real data on first run rather than "not dispatched".
 */

import type { Request } from "./types";

const STORAGE_KEY = "aigacp:ops:requests:v2";

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_REQUESTS: Request[] = [
  // ── New-model dispatch requests ─────────────────────────────────────────
  {
    id:          "req_001",
    type:        "manpower",
    trade:       "laborer",
    quantity:    3,
    jobsite:     "Highland Tower — Phase 2",
    dateNeeded:  "2026-05-06",
    notes:       "Need 3 laborers for slab prep on Level 9.",
    status:      "open",
    requestedBy: "Dan Ortega",
  },
  {
    id:          "req_002",
    type:        "manpower",
    trade:       "operator",
    quantity:    1,
    jobsite:     "Highland Tower — Phase 2",
    dateNeeded:  "2026-05-07",
    notes:       "Tower crane operator needed — current operator OT maxed out.",
    status:      "open",
    requestedBy: "Dan Ortega",
  },
  {
    id:          "req_003",
    type:        "equipment",
    equipmentType: "Compact Excavator",
    quantity:    1,
    jobsite:     "Eastside Medical Campus",
    dateNeeded:  "2026-05-05",
    notes:       "Utility trench near Building B — compact only, tight access.",
    status:      "open",
    requestedBy: "Jake Powell",
  },
  {
    id:          "req_004",
    type:        "manpower",
    trade:       "finisher",
    quantity:    2,
    jobsite:     "Riverside District Parking",
    dateNeeded:  "2026-05-04",
    notes:       "Concrete finishers for Level 3 deck.",
    status:      "closed",
    requestedBy: "Sarah Kim",
    assignedTo:  "Marco Reyes, Luis Torres",
    assignedFrom: "Eastside Medical Campus",
    assignedAt:  "2026-05-03T14:22:00Z",
    assignedBy:  "Marcus Webb",
  },
  // ── Pour-linked requests (legacy model — managed by pour schedule) ──────
  {
    id:                  "req_pour_001_pump",
    type:                "pump_truck",
    jobsite:             "Highland Tower — Phase 2",
    dateNeeded:          "2026-04-12",
    notes:               "Pump truck for 220 yd³ pour.",
    status:              "pending",
    requestedBy:         "Marcus Webb",
    requestedByUserId:   "user_owner_001",
    sourcePourId:        "pour_001",
  },
];

// ── Internal state ────────────────────────────────────────────────────────────

let _cache: Request[] | null = null;

function load(): Request[] {
  if (_cache !== null) return _cache;
  if (typeof window === "undefined") {
    return SEED_REQUESTS.map((r) => ({ ...r }));
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      _cache = JSON.parse(raw) as Request[];
      return _cache;
    }
  } catch {
    // Ignore parse errors — fall through to seed
  }
  _cache = SEED_REQUESTS.map((r) => ({ ...r }));
  persist(_cache);
  return _cache;
}

function persist(requests: Request[]): void {
  _cache = requests;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // Storage quota exceeded or private browsing — ignore
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getAllRequests(): Request[] {
  return load();
}

export function saveAll(requests: Request[]): void {
  persist(requests);
}

/** Dev-only: wipe localStorage and reload seed data. */
export function resetToSeed(): Request[] {
  _cache = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  return load();
}
