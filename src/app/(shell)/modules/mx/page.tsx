"use client";

import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { Wrench, CalendarClock, Activity, ArrowUpRight, ClipboardList, LayoutDashboard } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";

const FEATURES = [
  {
    icon:  <ClipboardList size={16} className="text-teal" />,
    title: "My Work",
    desc:  "Your assigned work orders — in progress now, scheduled next, and queued. The mechanic-centric view for daily execution.",
    href:  "/modules/mx/my-work",
  },
  {
    icon:  <LayoutDashboard size={16} className="text-teal" />,
    title: "Dashboard",
    desc:  "Shop lead overview: unassigned WOs, in-progress count, parts holdups, and OPS-blocking signals at a glance.",
    href:  "/modules/mx/dashboard",
  },
  {
    icon:  <Wrench       size={16} className="text-teal" />,
    title: "Work Orders",
    desc:  "Create and track maintenance work orders from open through completion — with priority triage, mechanic assignment, and readiness impact.",
    href:  "/modules/mx/work-orders",
  },
  {
    icon:  <CalendarClock size={16} className="text-teal" />,
    title: "Scheduling",
    desc:  "Assign mechanics to work orders. Sorted unassigned queue (OPS-blocking → priority → date) with per-mechanic lane breakdown.",
    href:  "/modules/mx/scheduling",
  },
  {
    icon:  <Activity size={16} className="text-teal" />,
    title: "Readiness",
    desc:  "Equipment readiness derived from active work-order state. OPS can consume readiness signals without managing repair execution.",
    href:  "/modules/mx/readiness",
  },
];

export default function MxPage() {
  const { role } = useOrg();
  const showMyWork = role === "mechanic" || role === "owner" || role === "admin" || role === "equipment_director" || role === "operations_manager";
  const features = FEATURES.filter((f) => f.href !== "/modules/mx/my-work" || showMyWork);

  return (
    <PageContainer>

      {/* ── Module Hero ─────────────────────────────────────────────────── */}
      <div
        className="rounded-[var(--radius-card)] border border-teal/30 bg-gradient-to-br from-surface-raised to-surface-overlay p-8 mb-6"
        style={{ boxShadow: "0 0 0 1px rgba(0,200,180,0.08), 0 4px 24px rgba(0,200,180,0.08)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-teal" />
          <span className="text-xs font-bold uppercase tracking-widest text-teal">Module · Maintenance Execution</span>
        </div>
        <h1 className="text-2xl font-bold text-content-primary">MX</h1>
        <p className="text-content-secondary mt-2 max-w-md leading-relaxed">
          Maintenance execution layer. Create work orders, schedule mechanics, and derive equipment readiness — so OPS can plan with confidence.
        </p>
        <Link
          href="/modules/mx/work-orders"
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-lg bg-teal hover:opacity-90 text-white text-sm font-semibold transition-opacity"
        >
          Open Work Orders <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* ── Feature Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {features.map((f) => (
          <Link key={f.title} href={f.href}>
            <Card variant="default" className="h-full hover:border-teal/25 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center mb-3">
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
