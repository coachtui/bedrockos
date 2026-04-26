import type { ModuleId, ModuleScope, UserRole } from "@/types/org";

export type RoleManifestEntry = Partial<Record<UserRole, ModuleScope>>;

/**
 * Role × module access matrix.
 * Two-axis gating: visibility (hidden = not shown) and scope (what you can do).
 *
 * viewer: read-only shell only — all modules hidden.
 */
export const MODULE_ROLE_MANIFEST: Record<ModuleId, RoleManifestEntry> = {
  cru: {
    owner:            "full",
    admin:            "full",
    pm:               "read",
    project_engineer: "full",
    superintendent:   "read",
    foreman:          "read",
    mechanic:         "hidden",
    viewer:           "hidden",
  },
  datum: {
    owner:            "full",
    admin:            "full",
    pm:               "read",
    project_engineer: "full",
    superintendent:   "full",
    foreman:          "full",
    mechanic:         "hidden",
    viewer:           "hidden",
  },
  mx: {
    owner:            "full",
    admin:            "full",
    pm:               "read",
    project_engineer: "read",
    superintendent:   "read",
    foreman:          "read",
    mechanic:         "my_work",
    viewer:           "hidden",
  },
  fix: {
    owner:            "full",
    admin:            "full",
    pm:               "read",
    project_engineer: "read",
    superintendent:   "field",
    foreman:          "field",
    mechanic:         "my_work",
    viewer:           "hidden",
  },
  inspect: {
    owner:            "full",
    admin:            "full",
    pm:               "full",
    project_engineer: "full",
    superintendent:   "full",
    foreman:          "my_work",
    mechanic:         "my_work",
    viewer:           "hidden",
  },
  ops: {
    owner:            "full",
    admin:            "full",
    pm:               "full",
    project_engineer: "full",
    superintendent:   "read",
    foreman:          "read",
    mechanic:         "hidden",
    viewer:           "hidden",
  },
  schedule: {
    owner:            "full",
    admin:            "full",
    pm:               "full",
    project_engineer: "full",
    superintendent:   "read",
    foreman:          "read",
    mechanic:         "hidden",
    viewer:           "hidden",
  },
};

/** Returns the scope a role has for a module. Defaults to "hidden". */
export function getModuleScope(moduleId: ModuleId, role: UserRole): ModuleScope {
  return MODULE_ROLE_MANIFEST[moduleId]?.[role] ?? "hidden";
}

/** Returns true if the role should see this module in the launchpad/nav. */
export function isModuleVisibleToRole(moduleId: ModuleId, role: UserRole): boolean {
  return getModuleScope(moduleId, role) !== "hidden";
}
