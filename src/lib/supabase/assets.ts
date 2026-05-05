import "server-only";
import { supabase } from "./server";
import { logSupabaseReadFailure } from "./errors";
import type { Asset, AssetStatus } from "@/types/domain";

const KNOWN_ASSET_STATUSES = new Set<AssetStatus>([
  "active", "maintenance", "offline",
]);

function toAssetStatus(status: string): AssetStatus {
  return KNOWN_ASSET_STATUSES.has(status as AssetStatus)
    ? (status as AssetStatus)
    : "active";
}

export async function fetchOrgAssets(orgId: string): Promise<Asset[]> {
  try {
    const { data, error } = await supabase
      .from("assets")
      .select("id, name, type, status, project_id, last_seen")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      logSupabaseReadFailure(`fetchOrgAssets(${orgId})`, error);
      return [];
    }
    if (!data) return [];

    return data.map((row) => ({
      id:         row.id,
      name:       row.name,
      type:       row.type,
      status:     toAssetStatus(row.status),
      project_id: row.project_id,
      last_seen:  row.last_seen,
    }));
  } catch (err) {
    logSupabaseReadFailure(`fetchOrgAssets(${orgId})`, err);
    return [];
  }
}

export async function fetchOrgAssetById(
  orgId: string,
  assetId: string,
): Promise<Asset | null> {
  try {
    const { data, error } = await supabase
      .from("assets")
      .select("id, name, type, status, project_id, last_seen")
      .eq("org_id", orgId)
      .eq("id", assetId)
      .single();

    if (error) {
      logSupabaseReadFailure(`fetchOrgAssetById(${orgId}, ${assetId})`, error);
      return null;
    }
    if (!data) return null;

    return {
      id:         data.id,
      name:       data.name,
      type:       data.type,
      status:     toAssetStatus(data.status),
      project_id: data.project_id,
      last_seen:  data.last_seen,
    };
  } catch (err) {
    logSupabaseReadFailure(`fetchOrgAssetById(${orgId}, ${assetId})`, err);
    return null;
  }
}
