"use client";

import Link        from "next/link";
import { usePathname } from "next/navigation";
import { Building2, BarChart2, DollarSign } from "lucide-react";
import { BedrockGrid } from "@/components/brand/BedrockGrid";

const NAV = [
  { href: "/platform/orgs",      label: "Organizations", icon: Building2, available: true  },
  { href: "/platform/analytics", label: "Analytics",     icon: BarChart2,  available: false },
  { href: "/platform/revenue",   label: "Revenue",       icon: DollarSign, available: false },
];

export function PlatformShell({
  children,
  userName,
}: {
  children:  React.ReactNode;
  userName:  string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-surface-raised border-r border-surface-border shrink-0 fixed top-0 bottom-0 left-0 z-30">
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-surface-border">
          <BedrockGrid variant="icon" size="sm" className="shrink-0" />
          <div>
            <p className="text-content-primary text-[12px] font-bold leading-none tracking-wide">BedrockOS</p>
            <p className="text-content-muted text-[9px] uppercase tracking-widest leading-tight mt-0.5">
              Platform Admin
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3">
          <p className="text-content-muted text-[9px] font-bold uppercase tracking-widest px-2 mb-3">
            Manage
          </p>
          <div className="space-y-0.5">
            {NAV.map(({ href, label, icon: Icon, available }) => {
              const active = pathname.startsWith(href);
              if (!available) {
                return (
                  <div
                    key={href}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-md opacity-40 cursor-default"
                  >
                    <Icon size={14} className="text-content-muted shrink-0" />
                    <span className="text-content-muted text-[12px]">{label}</span>
                    <span className="ml-auto text-[9px] text-content-muted border border-surface-border px-1.5 py-0.5 rounded">
                      Soon
                    </span>
                  </div>
                );
              }
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors ${
                    active
                      ? "bg-[#1a1f35] text-[#a5b4fc]"
                      : "text-content-muted hover:text-content-primary hover:bg-white/5"
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  <span className="text-[12px] font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-border">
          <p className="text-content-primary text-[11px] font-semibold truncate">{userName}</p>
          <p className="text-content-muted text-[9px]">Founder · AIGA LLC</p>
        </div>
      </aside>

      {/* Main — offset by sidebar width */}
      <main className="flex-1 md:pl-56 min-h-screen">{children}</main>
    </div>
  );
}
