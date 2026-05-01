"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Truck, HardHat, Activity,
  MapPin, Wrench, Users, ClipboardCheck, ClipboardList,
  Building, UserCog, Lock, ChevronLeft, ChevronRight,
  AlertCircle, Bell,
} from "lucide-react";
import { useUI } from "@/providers/UIProvider";
import { useOrg } from "@/providers/OrgProvider";
import { NAV_SECTIONS } from "@/lib/nav/nav-config";

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={16} />,
  Building2:       <Building2       size={16} />,
  Truck:           <Truck           size={16} />,
  HardHat:         <HardHat         size={16} />,
  Activity:        <Activity        size={16} />,
  MapPin:          <MapPin          size={16} />,
  Wrench:          <Wrench          size={16} />,
  Users:           <Users           size={16} />,
  ClipboardCheck:  <ClipboardCheck  size={16} />,
  Building:        <Building        size={16} />,
  UserCog:         <UserCog         size={16} />,
  Lock:            <Lock            size={16} />,
  AlertCircle:     <AlertCircle     size={16} />,
  Bell:            <Bell            size={16} />,
  ClipboardList:   <ClipboardList   size={16} />,
};

export function Sidebar() {
  const pathname          = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUI();
  const { role } = useOrg();

  return (
    <aside
      className={`
        hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-30
        bg-surface-raised border-r border-surface-border
        transition-all duration-200 ease-in-out
        ${sidebarCollapsed ? "w-16" : "w-60"}
      `}
    >
      {/* Logo / brand mark */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-surface-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center shrink-0">
          <span className="text-content-inverse text-[11px] font-black tracking-tighter">AC</span>
        </div>
        {!sidebarCollapsed && (
          <span className="font-bold text-sm text-content-primary tracking-tight whitespace-nowrap overflow-hidden">
            AIGA Construction
          </span>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            {!sidebarCollapsed && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted px-2 mb-1">
                {section.title}
              </p>
            )}
            {sidebarCollapsed && <div className="h-px bg-surface-border mx-2 mb-2" />}
            <ul className="space-y-0.5">
              {section.items
                .filter((item) => {
                  // Field roles manage workers and crews through CX module, not core shell views
                  if (
                    (item.href === "/workers" || item.href === "/crews") &&
                    (role === "foreman" || role === "superintendent" || role === "project_engineer" || role === "mechanic")
                  ) return false;
                  return true;
                })
                .map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`
                        flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm transition-colors duration-100
                        ${isActive
                          ? "bg-gold/10 text-gold border-l-2 border-gold pl-[6px]"
                          : "text-content-secondary hover:text-content-primary hover:bg-surface-overlay"
                        }
                        ${sidebarCollapsed ? "justify-center" : ""}
                      `}
                    >
                      <span className="shrink-0">{ICON_MAP[item.icon]}</span>
                      {!sidebarCollapsed && (
                        <span className="truncate font-medium">{item.label}</span>
                      )}
                      {!sidebarCollapsed && item.badge != null && item.badge > 0 && (
                        <span className="ml-auto bg-status-critical text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-surface-border p-2 shrink-0">
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center w-full h-8 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-overlay transition-colors"
        >
          {sidebarCollapsed
            ? <ChevronRight size={14} />
            : <><ChevronLeft size={14} /><span className="ml-2 text-xs font-medium">Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
}
