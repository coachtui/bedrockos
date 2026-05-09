"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Activity, Grid3x3 } from "lucide-react";
import { MobileDrawer } from "./MobileDrawer";

const PRIMARY_TABS = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
  { label: "Projects",  href: "/projects",  icon: <Building2       size={20} /> },
  { label: "Activity",  href: "/activity",  icon: <Activity        size={20} /> },
];

export function MobileNav() {
  const pathname   = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe pl-safe pr-safe bg-surface-raised/95 backdrop-blur-md border-t border-surface-border"
      >
        <div className="flex items-stretch h-14">
          {PRIMARY_TABS.map((tab) => {
            const isActive = pathname === tab.href || (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors active:bg-surface-overlay/60 ${
                  isActive ? "text-gold" : "text-content-secondary"
                }`}
              >
                {tab.icon}
                <span className="text-[11px] font-semibold tracking-tight">{tab.label}</span>
              </Link>
            );
          })}

          {/* All nav drawer */}
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setDrawerOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 text-content-secondary transition-colors active:bg-surface-overlay/60"
          >
            <Grid3x3 size={20} />
            <span className="text-[11px] font-semibold tracking-tight">More</span>
          </button>
        </div>
      </nav>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
