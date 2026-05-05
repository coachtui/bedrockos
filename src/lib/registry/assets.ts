/**
 * OrgAssetRegistry — client-safe helpers for already-loaded asset collections.
 *
 * Server data fetching lives in "@/lib/supabase/assets". This file is exported
 * by the registry barrel and may be imported by Client Components.
 */

import type { Asset } from "@/types/domain";
import type { ReadinessStatus } from "@/lib/mx/types";

export interface OrgAsset extends Asset {
  orgId:              string;
  readiness?:         ReadinessStatus;
  lastDiagnostic?:    string;   // ISO datetime of last Fix diagnostic session
  activeWorkOrderId?: string;   // MX work order currently open for this asset
}

/** Returns all assets from an already-loaded collection, optionally filtered to a project. */
export function getOrgAssets(
  assets: Asset[],
  orgId: string,
  projectId?: string,
): OrgAsset[] {
  const filtered = projectId
    ? assets.filter((a) => a.project_id === projectId)
    : assets;
  return filtered.map((a) => ({ ...a, orgId }));
}

/** Returns a single asset by ID from an already-loaded collection, or null if not found. */
export function getAssetById(
  assets: Asset[],
  id: string,
  orgId: string,
): OrgAsset | null {
  const asset = assets.find((a) => a.id === id) ?? null;
  if (!asset) return null;
  return { ...asset, orgId };
}
