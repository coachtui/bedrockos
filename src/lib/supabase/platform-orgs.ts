import "server-only";
import { supabase } from "./server";
import type { PlatformOrg, PlatformOrgStatus, UpdateOrgInput } from "@/types/platform";
import type { ModuleId } from "@/types/org";

function toPlatformOrg(row: Record<string, unknown>): PlatformOrg {
  return {
    id:             String(row.id   ?? ""),
    name:           String(row.name ?? ""),
    slug:           String(row.slug ?? ""),
    status:         String(row.status ?? "trial") as PlatformOrgStatus,
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
  const { error } = await supabase.from("organizations").insert({
    id:              input.id,
    name:            input.name,
    slug:            input.slug,
    status:          input.status,
    enabled_modules: input.enabledModules,
  });
  if (error) return { error: error.message };
  return {};
}

export async function updateOrg(input: UpdateOrgInput): Promise<{ error?: string }> {
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
}
