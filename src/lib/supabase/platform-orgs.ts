import "server-only";
import { supabase } from "./server";
import type { PlatformOrg, PlatformOrgStatus, UpdateOrgInput } from "@/types/platform";
import type { ModuleId } from "@/types/org";

const KNOWN_ORG_STATUSES = new Set<PlatformOrgStatus>([
  "active", "trial", "internal", "inactive",
]);

function toPlatformOrgStatus(s: string): PlatformOrgStatus {
  return KNOWN_ORG_STATUSES.has(s as PlatformOrgStatus)
    ? (s as PlatformOrgStatus)
    : "trial";
}

function toPlatformOrg(row: Record<string, unknown>): PlatformOrg {
  return {
    id:             String(row.id   ?? ""),
    name:           String(row.name ?? ""),
    slug:           String(row.slug ?? ""),
    status:         toPlatformOrgStatus(String(row.status ?? "trial")),
    enabledModules: Array.isArray(row.enabled_modules)
      ? (row.enabled_modules as string[]) as ModuleId[]
      : [],
    userCount:      0, // TODO: join org_users count when needed
    createdAt:      String(row.created_at ?? "").slice(0, 7),
  };
}

export async function fetchPlatformOrgs(): Promise<PlatformOrg[]> {
  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug, status, enabled_modules, created_at")
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(toPlatformOrg);
  } catch {
    return [];
  }
}

export async function fetchPlatformOrg(orgId: string): Promise<PlatformOrg | null> {
  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug, status, enabled_modules, created_at")
      .eq("id", orgId)
      .single();
    if (error || !data) return null;
    return toPlatformOrg(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function insertOrg(input: {
  id:             string;
  name:           string;
  slug:           string;
  status:         PlatformOrgStatus;
  enabledModules: ModuleId[];
}): Promise<{ error?: string }> {
  try {
    const { error } = await supabase.from("organizations").insert({
      id:              input.id,
      name:            input.name,
      slug:            input.slug,
      status:          input.status,
      enabled_modules: input.enabledModules,
    });
    if (error) return { error: error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function updateOrg(input: UpdateOrgInput): Promise<{ error?: string }> {
  try {
    const { error } = await supabase
      .from("organizations")
      .update({
        name:            input.name,
        status:          input.status,
        enabled_modules: input.enabledModules,
      })
      .eq("id", input.id);
    if (error) return { error: error.message };
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}
