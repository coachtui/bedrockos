import type { UserRole } from "@/types/org";

export const ROLE_LABELS: Record<UserRole, string> = {
  owner:              "Owner",
  admin:              "Admin",
  equipment_director: "Equipment Director",
  operations_manager: "Operations Manager",
  pm:                 "Project Manager",
  project_engineer:   "Project Engineer",
  superintendent:     "Superintendent",
  foreman:            "Foreman",
  mechanic:           "Mechanic",
  viewer:             "Viewer",
};

export const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  owner:              "text-gold border-gold/30 bg-[var(--gold-subtle)]",
  admin:              "text-blue-brand border-blue-brand/30 bg-[var(--blue-brand-subtle)]",
  equipment_director: "text-blue-brand border-blue-brand/30 bg-[var(--blue-brand-subtle)]",
  operations_manager: "text-blue-brand border-blue-brand/30 bg-[var(--blue-brand-subtle)]",
  pm:                 "text-teal border-teal/30 bg-[var(--teal-subtle)]",
  project_engineer:   "text-blue-brand border-blue-brand/30 bg-[var(--blue-brand-subtle)]",
  superintendent:     "text-gold border-gold/30 bg-[var(--gold-subtle)]",
  foreman:            "text-content-secondary border-surface-border-hover bg-surface-border",
  mechanic:           "text-teal border-teal/30 bg-[var(--teal-subtle)]",
  viewer:             "text-content-secondary border-surface-border-hover bg-surface-border",
};
