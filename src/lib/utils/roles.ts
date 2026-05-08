import type { UserRole } from "@/types/org";

export type RoleGroup = "oversight" | "office" | "field" | "maintenance";

export function getRoleGroup(role: UserRole): RoleGroup {
  switch (role) {
    case "owner":
    case "admin":
    case "equipment_director":
    case "operations_manager":
      return "oversight";
    case "pm":
    case "project_engineer":
      return "office";
    case "superintendent":
    case "foreman":
      return "field";
    case "mechanic":
      return "maintenance";
    case "viewer":
      return "office";
    default:
      return "oversight";
  }
}
