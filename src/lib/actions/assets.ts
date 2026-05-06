"use server";

import { supabase } from "@/lib/supabase/server";
import { throwSupabaseWriteFailure } from "@/lib/supabase/errors";
import type { Asset, AssetStatus } from "@/types/domain";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export async function serverCreateAsset(asset: Asset): Promise<void> {
  const { error } = await supabase.from("assets").insert({
    id:         asset.id,
    org_id:     ORG_ID,
    name:       asset.name,
    type:       asset.type,
    status:     asset.status,
    project_id: asset.project_id,
    last_seen:  asset.last_seen,
  });
  if (error) throwSupabaseWriteFailure(`serverCreateAsset(${asset.id})`, error);
}

export async function serverUpdateAssetStatus(
  assetId: string,
  status: AssetStatus,
): Promise<void> {
  const { error } = await supabase
    .from("assets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", assetId)
    .eq("org_id", ORG_ID);
  if (error) throwSupabaseWriteFailure(`serverUpdateAssetStatus(${assetId})`, error);
}

export async function serverUpdateAssetProject(
  assetId: string,
  projectId: string,
): Promise<void> {
  const { error } = await supabase
    .from("assets")
    .update({ project_id: projectId, updated_at: new Date().toISOString() })
    .eq("id", assetId)
    .eq("org_id", ORG_ID);
  if (error) throwSupabaseWriteFailure(`serverUpdateAssetProject(${assetId})`, error);
}
