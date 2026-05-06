import type { ModuleId } from "@/types/org";

export interface ModuleDefinition {
  id:          ModuleId;
  label:       string;
  description: string;
  route:       string;
  category:    "field_ops" | "equipment" | "data" | "diagnostics" | "operations" | "safety";
  accentColor: "gold" | "teal" | "blue" | "red";
  tagline:     string;
}

export const MODULE_REGISTRY: ModuleDefinition[] = [
  {
    id:          "cru",
    label:       "CX",
    description: "Crew resource and utilization management",
    tagline:     "Schedule, track, and optimize your crews in the field.",
    route:       "/modules/cru",
    category:    "field_ops",
    accentColor: "gold",
  },
  {
    id:          "fix",
    label:       "FX",
    description: "AI-powered equipment diagnostic intelligence",
    tagline:     "Proactive diagnostics. Fewer breakdowns. More uptime.",
    route:       "/modules/fix",
    category:    "diagnostics",
    accentColor: "teal",
  },
  {
    id:          "inspect",
    label:       "IX",
    description: "Field inspection workflows and reporting",
    tagline:     "Capture, document, and sign off on inspections anywhere.",
    route:       "/modules/inspect",
    category:    "field_ops",
    accentColor: "blue",
  },
  {
    id:          "datum",
    label:       "DX",
    description: "GPS + map overlay for field layout and crew alignment",
    tagline:     "Fast field layout without the full survey setup.",
    route:       "/modules/datum",
    category:    "field_ops",
    accentColor: "teal",
  },
  {
    id:          "ops",
    label:       "OX",
    description: "Operations and workflow engine",
    tagline:     "Work orders, field requests, and pour schedules — coordinated.",
    route:       "/modules/ops",
    category:    "operations",
    accentColor: "gold",
  },
  {
    id:          "mx",
    label:       "MX",
    description: "Maintenance execution — work orders, mechanic scheduling, equipment readiness",
    tagline:     "Create work orders, schedule mechanics, and track equipment readiness.",
    route:       "/modules/mx",
    category:    "equipment",
    accentColor: "teal",
  },
  {
    id:          "safety",
    label:       "SX",
    description: "Safety incidents, hazard observations, and near-miss reporting",
    tagline:     "Capture incidents and hazards on the spot. Audit-ready records.",
    route:       "/modules/safety",
    category:    "safety",
    accentColor: "red",
  },
];

export function getModuleById(id: ModuleId): ModuleDefinition | undefined {
  return MODULE_REGISTRY.find((m) => m.id === id);
}
