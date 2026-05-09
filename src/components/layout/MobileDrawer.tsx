"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Truck, HardHat, Activity,
  MapPin, Wrench, Users, BarChart3, ClipboardCheck, ClipboardList,
  Building, UserCog, Lock, X, AlertCircle, Bell, ShieldAlert,
} from "lucide-react";
import { NAV_SECTIONS } from "@/lib/nav/nav-config";
import { useOrg } from "@/providers/OrgProvider";
import { BedrockGrid } from "@/components/brand/BedrockGrid";
import { ProjectSelector } from "./ProjectSelector";

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={16} />,
  Building2:       <Building2       size={16} />,
  Truck:           <Truck           size={16} />,
  HardHat:         <HardHat         size={16} />,
  Activity:        <Activity        size={16} />,
  MapPin:          <MapPin          size={16} />,
  Wrench:          <Wrench          size={16} />,
  Users:           <Users           size={16} />,
  BarChart3:       <BarChart3       size={16} />,
  ClipboardCheck:  <ClipboardCheck  size={16} />,
  ClipboardList:   <ClipboardList   size={16} />,
  Building:        <Building        size={16} />,
  UserCog:         <UserCog         size={16} />,
  Lock:            <Lock            size={16} />,
  AlertCircle:     <AlertCircle     size={16} />,
  Bell:            <Bell            size={16} />,
  ShieldAlert:     <ShieldAlert     size={16} />,
};

interface MobileDrawerProps {
  open:    boolean;
  onClose: () => void;
}

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { role, enabledModules } = useOrg();

  /* Lock body scroll when open */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`md:hidden fixed inset-0 z-50 bg-black/60 transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`md:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-surface-raised border-r border-surface-border flex flex-col transition-transform duration-200 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <BedrockGrid size="sm" variant="icon" className="shrink-0" />
            <span className="font-mono font-bold text-[13px] uppercase tracking-[0.18em] text-content-primary leading-none whitespace-nowrap">
              BEDROCK<span className="text-gold">OS</span>
            </span>
          </div>
          <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Project switcher */}
        <div className="px-3 py-3 border-b border-surface-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted px-1 mb-1.5">
            Active project
          </p>
          <ProjectSelector />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter((item) => {
              // Field roles manage workers and crews through CX module, not core shell views
              if (
                (item.href === "/workers" || item.href === "/crews") &&
                (role === "foreman" || role === "superintendent" || role === "project_engineer" || role === "mechanic")
              ) return false;
              // Module-scoped items only appear when the org has the module enabled
              if (item.moduleId && !enabledModules.includes(item.moduleId)) return false;
              return true;
            });
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.title}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted px-2 mb-1">
                  {section.title}
                </p>
                <ul className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                              ? "bg-gold/10 text-gold border-l-2 border-gold pl-[6px]"
                              : "text-content-secondary hover:text-content-primary hover:bg-surface-overlay"
                          }`}
                        >
                          <span className="shrink-0">{ICON_MAP[item.icon]}</span>
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
}
