"use client";

import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { Users, CalendarDays, Truck, LayoutGrid, ArrowUpRight } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";

const FEATURES = [
  {
    icon:  <Users        size={16} className="text-gold" />,
    title: "Roster",
    desc:  "Live workforce for this project — primary and borrowed workers, grouped by role.",
    href:  "/modules/cru/roster",
  },
  {
    icon:  <LayoutGrid   size={16} className="text-gold" />,
    title: "Assignments",
    desc:  "Weekly worker schedule across projects. See where masons and shared crews are each day.",
    href:  "/modules/cru/assignments",
  },
  {
    icon:  <CalendarDays size={16} className="text-gold" />,
    title: "Schedule",
    desc:  "4-week site calendar with Gantt view and per-day staffing status.",
    href:  "/modules/cru/schedule",
  },
  {
    icon:  <Truck        size={16} className="text-gold" />,
    title: "Equipment",
    desc:  "Equipment and assets currently assigned to this project.",
    href:  "/modules/cru/equipment",
  },
];

export default function CxPage() {
  const { role } = useOrg();
  const features = role === "foreman"
    ? FEATURES.filter((f) => f.href === "/modules/cru/roster")
    : FEATURES;

  return (
    <PageContainer>
      <div
        className="rounded-[var(--radius-card)] border border-gold/30 bg-gradient-to-br from-surface-raised to-surface-overlay p-8 mb-6"
        style={{ boxShadow: "0 0 0 1px rgba(212,175,55,0.08), 0 4px 24px rgba(212,175,55,0.08)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-gold" />
          <span className="text-xs font-bold uppercase tracking-widest text-gold">Module · Crew & Utilization</span>
        </div>
        <h1 className="text-2xl font-bold text-content-primary">CX</h1>
        <p className="text-content-secondary mt-2 max-w-md leading-relaxed">
          Schedule, assign, and track your field crews — from roster to site schedule to daily staffing status.
        </p>
        <Link
          href="/modules/cru/roster"
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-lg bg-gold hover:bg-gold/90 text-black text-sm font-semibold transition-colors"
        >
          View Roster <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f) => (
          <Link key={f.title} href={f.href}>
            <Card variant="default" className="h-full hover:border-gold/25 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center mb-3">
                {f.icon}
              </div>
              <p className="font-semibold text-content-primary text-sm">{f.title}</p>
              <p className="text-xs text-content-secondary mt-1.5 leading-relaxed">{f.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
