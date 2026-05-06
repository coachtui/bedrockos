import type { BundleId, ModuleId } from "@/types/org";

export interface BundleDefinition {
  id:      BundleId;
  label:   string;
  modules: ModuleId[];
}

export const BUNDLE_REGISTRY: BundleDefinition[] = [
  {
    id:      "field_ops",
    label:   "Field Ops",
    modules: ["cru", "datum"],
  },
  {
    id:      "equipment",
    label:   "Equipment",
    modules: ["mx", "fix", "inspect"],
  },
  {
    id:      "operations",
    label:   "Operations",
    modules: ["ops", "schedule"],
  },
  {
    id:      "safety",
    label:   "Safety",
    modules: ["safety"],
  },
];

/** Returns the unique set of module IDs across all provided bundle IDs. */
export function getModulesForBundles(bundleIds: BundleId[]): ModuleId[] {
  const modules = BUNDLE_REGISTRY
    .filter((b) => bundleIds.includes(b.id))
    .flatMap((b) => b.modules);
  return [...new Set(modules)];
}
