export type ModuleId = "cru" | "fix" | "inspect" | "datum" | "ops" | "mx" | "schedule";

export type BundleId = "field_ops" | "equipment" | "operations";

export type ModuleScope = "full" | "read" | "my_work" | "field" | "hidden";

export type UserRole =
  | "owner"
  | "admin"
  | "pm"
  | "project_engineer"
  | "superintendent"
  | "foreman"
  | "mechanic"
  | "viewer";

export interface OrgContext {
  id:        string;
  name:      string;
  slug:      string;
  /**
   * UUID of the matching organization in CRU's Supabase database.
   * Used for all calls through the /api/cru/ops proxy.
   * Must be a real UUID — CRU rejects non-UUID org IDs.
   * When undefined, falls back to `id` (which will fail against a real CRU DB).
   */
  cruOrgId?: string;
}

export interface ProjectContext {
  id:   string;
  name: string;
  slug: string;
}

export interface UserContext {
  id:     string;
  name:   string;
  email:  string;
  role:   UserRole;
  avatar: string | null;
}

export type ModuleFeatureMap = Record<string, boolean>;

export interface OrgConfig {
  org:              OrgContext;
  currentProject:   ProjectContext;
  currentUser:      UserContext;
  purchasedBundles: BundleId[];
  features:         Partial<Record<ModuleId, ModuleFeatureMap>>;
}
