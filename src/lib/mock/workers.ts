import type { OrgWorker } from "@/types/domain";

export const MOCK_WORKERS: OrgWorker[] = [
  // Mechanics
  { id: "worker_001", orgId: "org_aiga_001", name: "Tony Reeves",    role: "mechanic", userId: "cru_w_001", available: true,  skills: ["Hydraulic Systems", "Diesel Engine"],       projectId: "proj_highland_002", siteName: "Highland Tower — Phase 2" },
  { id: "worker_002", orgId: "org_aiga_001", name: "Derek Walsh",    role: "mechanic", userId: "cru_w_002", available: true,  skills: ["Electrical Diagnostics", "Welding"],         projectId: "proj_eastside_007", siteName: "Eastside Medical Campus" },
  { id: "worker_003", orgId: "org_aiga_001", name: "Carlos Mejia",   role: "mechanic", userId: "cru_w_003", available: true,  skills: ["Hydraulic Systems", "Electrical Diagnostics"] },
  { id: "worker_004", orgId: "org_aiga_001", name: "Priya Nair",     role: "mechanic", userId: "cru_w_004", available: false, skills: ["Diesel Engine", "Welding"] },

  // Drivers
  { id: "worker_005", orgId: "org_aiga_001", name: "Marco Ruiz",     role: "driver",         userId: null,        available: true,  skills: [], projectId: "proj_riverside_006", siteName: "Riverside District Parking" },
  { id: "worker_006", orgId: "org_aiga_001", name: "Jean Lafleur",   role: "driver",         userId: null,        available: true,  skills: [] },
  { id: "worker_007", orgId: "org_aiga_001", name: "Kenji Tanaka",   role: "driver",         userId: null,        available: false, skills: [] },

  // Masons
  { id: "worker_008", orgId: "org_aiga_001", name: "Luis Torres",    role: "mason",          userId: null,        available: true,  skills: [], projectId: "proj_highland_002", siteName: "Highland Tower — Phase 2" },
  { id: "worker_009", orgId: "org_aiga_001", name: "Ahmed Siddiqui", role: "mason",          userId: null,        available: true,  skills: [] },
  { id: "worker_010", orgId: "org_aiga_001", name: "Bruno Costa",    role: "mason",          userId: null,        available: false, skills: [] },

  // Foremen / Superintendents
  { id: "worker_011", orgId: "org_aiga_001", name: "Marcus Jimenez", role: "foreman",        userId: null,        available: true,  skills: [], projectId: "proj_highland_002", siteName: "Highland Tower — Phase 2" },
  { id: "worker_012", orgId: "org_aiga_001", name: "Carmen Nguyen",  role: "superintendent", userId: null,        available: true,  skills: [], projectId: "proj_oakridge_001", siteName: "Oakridge Industrial Complex" },
];
