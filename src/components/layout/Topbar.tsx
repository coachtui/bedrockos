"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { useUI } from "@/providers/UIProvider";
import { useOrg } from "@/providers/OrgProvider";
import { ProjectSelector } from "./ProjectSelector";
import { DevRoleSwitcher } from "@/components/dev/DevRoleSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ROLE_LABELS } from "@/lib/constants/roles";

function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";
  const last = segments[segments.length - 1];
  const map: Record<string, string> = {
    dashboard:            "Dashboard",
    projects:             "Projects",
    assets:               "Assets",
    crews:                "Crews",
    workers:              "Workers",
    activity:             "Activity",
    "field-operations":   "Field Operations",
    equipment:            "Equipment Intelligence",
    cru:                  "CRU",
    fix:                  "Fix",
    inspect:              "Inspect",
    datum:                "Datum",
    organization:         "Organization",
    users:                "Users & Roles",
    "feature-access":     "Feature Access",
  };
  return map[last] ?? last.charAt(0).toUpperCase() + last.slice(1);
}

export function Topbar() {
  const pathname          = usePathname();
  const { openSearch, openAssistant, isAssistantOpen, sidebarCollapsed } = useUI();
  const { currentUser }   = useOrg();

  const initials = currentUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const roleLabel = ROLE_LABELS[currentUser.role];

  return (
    <header className={`fixed top-0 right-0 z-20 h-14 bg-surface-base/80 backdrop-blur-md border-b border-surface-border flex items-center px-4 gap-4 transition-all duration-200 left-0 ${sidebarCollapsed ? "md:left-16" : "md:left-60"}`}
    >
      {/* Page title */}
      <h1 className="text-sm font-semibold text-content-primary truncate flex-1">
        {getPageTitle(pathname)}
      </h1>

      {/* Project selector */}
      <div className="hidden sm:block">
        <ProjectSelector />
      </div>

      {/* Dev role switcher */}
      <DevRoleSwitcher />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Search */}
        <button
          onClick={openSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-badge)] border border-surface-border bg-surface-overlay hover:border-surface-border-hover text-content-muted hover:text-content-primary transition-colors text-xs"
        >
          <Search size={13} />
          <span className="hidden md:inline font-medium">Search</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] text-content-muted bg-surface-base px-1 py-0.5 rounded border border-surface-border font-mono">⌘K</kbd>
        </button>

        {/* Assistant trigger */}
        <button
          onClick={openAssistant}
          title="AIGA Shell Assistant"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-badge)] border text-xs font-semibold transition-colors ${
            isAssistantOpen
              ? "border-gold/50 bg-gold/10 text-gold"
              : "border-surface-border bg-surface-overlay text-content-secondary hover:border-gold/30 hover:text-gold"
          }`}
        >
          <Sparkles size={13} />
          <span className="hidden sm:inline">AI</span>
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center">
            <span className="text-gold text-[11px] font-bold">{initials}</span>
          </div>
          <div className="hidden lg:flex flex-col items-start">
            <span className="text-xs font-semibold text-content-primary leading-none">{currentUser.name.split(" ")[0]}</span>
            <span className="text-[10px] text-content-muted">{roleLabel}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
