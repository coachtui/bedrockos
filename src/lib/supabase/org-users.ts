import "server-only";
import { supabase } from "./server";
import { logSupabaseReadFailure } from "./errors";
import type { UserRole } from "@/types/org";

const KNOWN_USER_ROLES = new Set<UserRole>([
  "owner", "admin", "equipment_director", "operations_manager",
  "pm", "project_engineer",
  "superintendent", "foreman", "mechanic", "viewer",
]);

function toUserRole(r: string): UserRole {
  return KNOWN_USER_ROLES.has(r as UserRole) ? (r as UserRole) : "viewer";
}

export interface OrgUserRow {
  id:      string;
  org_id:  string;
  auth_id: string;
  email:   string;
  name:    string;
  role:    UserRole;
}

function toOrgUserRow(row: Record<string, unknown>): OrgUserRow {
  return {
    id:      String(row.id      ?? ""),
    org_id:  String(row.org_id  ?? ""),
    auth_id: String(row.auth_id ?? ""),
    email:   String(row.email   ?? ""),
    name:    String(row.name    ?? ""),
    role:    toUserRole(String(row.role ?? "")),
  };
}

export async function fetchOrgUsers(orgId: string): Promise<OrgUserRow[]> {
  try {
    const { data, error } = await supabase
      .from("org_users")
      .select("id, org_id, auth_id, email, name, role")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });
    if (error) {
      logSupabaseReadFailure(`fetchOrgUsers(${orgId})`, error);
      return [];
    }
    if (!data) return [];
    return data.map(toOrgUserRow);
  } catch (err) {
    logSupabaseReadFailure(`fetchOrgUsers(${orgId})`, err);
    return [];
  }
}

export async function fetchOrgUser(
  orgId: string,
  authId: string,
): Promise<OrgUserRow | null> {
  try {
    const { data, error } = await supabase
      .from("org_users")
      .select("id, org_id, auth_id, email, name, role")
      .eq("org_id", orgId)
      .eq("auth_id", authId)
      .single();
    if (error) {
      logSupabaseReadFailure(`fetchOrgUser(${orgId}, ${authId})`, error);
      return null;
    }
    if (!data) return null;
    return toOrgUserRow(data);
  } catch (err) {
    logSupabaseReadFailure(`fetchOrgUser(${orgId}, ${authId})`, err);
    return null;
  }
}

/**
 * Look up the user's org_users row by auth_id alone — used by the shell layout
 * to discover which org a signed-in user belongs to. If the user is in multiple
 * orgs we take the earliest membership.
 */
export async function fetchOrgUserByAuthId(authId: string): Promise<OrgUserRow | null> {
  try {
    const { data, error } = await supabase
      .from("org_users")
      .select("id, org_id, auth_id, email, name, role")
      .eq("auth_id", authId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      logSupabaseReadFailure(`fetchOrgUserByAuthId(${authId})`, error);
      return null;
    }
    if (!data) return null;
    return toOrgUserRow(data);
  } catch (err) {
    logSupabaseReadFailure(`fetchOrgUserByAuthId(${authId})`, err);
    return null;
  }
}
