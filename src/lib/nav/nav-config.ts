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
      { label: "CRU",     href: "/modules/cru",     icon: "Users" },
      { label: "Datum",   href: "/modules/datum",   icon: "MapPin" },
      { label: "Inspect", href: "/modules/inspect", icon: "ClipboardCheck" },
      { label: "Fix",     href: "/modules/fix",     icon: "Wrench" },
      { label: "OPS",     href: "/modules/ops",     icon: "ClipboardList" },
      { label: "MX",      href: "/modules/mx",      icon: "Wrench" },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Organization",   href: "/admin/organization", icon: "Building" },
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
