import type { PlatformOrg } from "@/types/platform";

export const MOCK_PLATFORM_ORGS: PlatformOrg[] = [
  {
    id:             "org_acme",
    name:           "Acme Construction",
    slug:           "acme",
    status:         "active",
    enabledModules: ["cru", "fix", "mx"],
    userCount:      8,
    createdAt:      "2026-01",
  },
  {
    id:             "org_pacific",
    name:           "Pacific Grading",
    slug:           "pacific",
    status:         "trial",
    enabledModules: ["fix", "ops"],
    userCount:      3,
    createdAt:      "2026-04",
  },
  {
    id:             "org_demo",
    name:           "Demo Org",
    slug:           "demo",
    status:         "internal",
    enabledModules: ["cru", "fix", "mx", "ops"],
    userCount:      1,
    createdAt:      "2025-11",
  },
  {
    id:             "org_sunset",
    name:           "Sunset Builders",
    slug:           "sunset",
    status:         "inactive",
    enabledModules: ["cru"],
    userCount:      0,
    createdAt:      "2025-09",
  },
];
