import type { NavSection } from "@/types/nav";

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Core",
    items: [
      { label: "Dashboard",  href: "/dashboard", icon: "LayoutDashboard" },
      { label: "Projects",   href: "/projects",  icon: "Building2" },
      { label: "Assets",     href: "/assets",    icon: "Truck" },
      { label: "Crews",      href: "/crews",     icon: "HardHat" },
      { label: "Workers",    href: "/workers",   icon: "Users" },
      { label: "Activity",   href: "/activity",  icon: "Activity" },
      { label: "Issues",     href: "/issues",    icon: "AlertCircle" },
      { label: "Alerts",     href: "/alerts",    icon: "Bell" },
    ],
  },
  {
    title: "Modules",
    items: [
      { label: "CX", href: "/modules/cru",     icon: "Users",          moduleId: "cru" },
      { label: "DX", href: "/modules/datum",   icon: "MapPin",         moduleId: "datum" },
      { label: "IX", href: "/modules/inspect", icon: "ClipboardCheck", moduleId: "inspect" },
      { label: "FX", href: "/modules/fix",     icon: "Wrench",         moduleId: "fix" },
      { label: "OX", href: "/modules/ops",     icon: "ClipboardList",  moduleId: "ops" },
      { label: "MX", href: "/modules/mx",      icon: "Wrench",         moduleId: "mx" },
      { label: "SX", href: "/modules/safety",  icon: "ShieldAlert",    moduleId: "safety" },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Profile",         href: "/admin/organization", icon: "CircleUser" },
      { label: "Users & Roles",  href: "/admin/users",        icon: "UserCog" },
      { label: "Feature Access", href: "/admin/feature-access", icon: "Lock" },
    ],
  },
];

/* Bottom mobile tabs — 5 primary destinations */
export const MOBILE_TABS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Projects",  href: "/projects",  icon: "Building2" },
  { label: "Activity",  href: "/activity",  icon: "Activity" },
];
