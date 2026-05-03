import type { ModuleId } from "./org";

export type PlatformOrgStatus = "active" | "trial" | "internal" | "inactive";

export interface PlatformOrg {
  id:             string;
  name:           string;
  slug:           string;
  status:         PlatformOrgStatus;
  enabledModules: ModuleId[];
  userCount:      number;
  createdAt:      string; // "YYYY-MM"
}

export interface CreateOrgInput {
  name:           string;
  slug:           string;
  status:         PlatformOrgStatus;
  enabledModules: ModuleId[];
  adminName:      string;
  adminEmail:     string;
}

export interface UpdateOrgInput {
  id:             string;
  name:           string;
  status:         PlatformOrgStatus;
  enabledModules: ModuleId[];
}
