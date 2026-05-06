import type { ModuleId } from "@/types/org";

export interface NavItem {
  label: string;
  href:  string;
  icon:  string;
  badge?: number;
  moduleId?: ModuleId;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}
