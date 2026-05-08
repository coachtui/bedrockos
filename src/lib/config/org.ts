import type { OrgConfig, ProjectContext } from "@/types/org";

/* ─────────────────────────────────────────────────────────
   Mock selectable projects (used by ProjectSelector)
   ───────────────────────────────────────────────────────── */
export const MOCK_PROJECT_CONTEXTS: ProjectContext[] = [
  { id: "proj_highland_002",  name: "Highland Tower — Phase 2",    slug: "highland-tower-p2" },
  { id: "proj_oakridge_001",  name: "Oakridge Industrial Complex", slug: "oakridge-industrial" },
  { id: "proj_meridian_003",  name: "Meridian Bridge Rehab",       slug: "meridian-bridge" },
  { id: "proj_riverside_006", name: "Riverside District Parking",  slug: "riverside-district" },
  { id: "proj_eastside_007",  name: "Eastside Medical Campus",     slug: "eastside-medical" },
];

/* ─────────────────────────────────────────────────────────
   Mock org configuration
   ───────────────────────────────────────────────────────── */
export const MOCK_ORG_CONFIG: OrgConfig = {
  org: {
    id:        "org_aiga_001",
    name:      "AIGA Construction",
    slug:      "aiga",
    // Real UUID of the AIGA Construction organization in CRU's Supabase DB.
    // Find it in: CRU Supabase dashboard → Table editor → companies → id
    // or: SELECT id FROM companies WHERE slug = 'aiga' (or similar)
    cruOrgId:  process.env.NEXT_PUBLIC_CRU_ORG_ID ?? undefined,
  },
  currentProject: MOCK_PROJECT_CONTEXTS[0],
  // Placeholder only — OrgProvider replaces this with the signed-in Supabase
  // user via `initialUser`. Reached only on unauthenticated/dev paths.
  currentUser: {
    id:     "demo_user",
    name:   "Demo User",
    email:  "",
    role:   "owner",
    avatar: null,
  },
  purchasedBundles: ["field_ops", "equipment", "operations"],
  features: {
    cru: {
      scheduling:      true,
      mobile_clock_in: true,
      crew_chat:       false,
    },
    fix: {
      ai_diagnostics: true,
      fleet_priority:  true,
      obd_scan:        false,
    },
    inspect: {
      photo_reports:      true,
      custom_checklists:  true,
      sign_off:           false,
    },
    datum: {
      gps_layout:     true,
      map_overlays:   true,
      crew_alignment: true,
    },
    mx: {
      ai_scheduling: false,
    },
    schedule: {
      ai_agent: true,
    },
  },
};

export function getOrgConfig(): OrgConfig {
  return MOCK_ORG_CONFIG;
}
