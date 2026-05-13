import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { ClipboardList, Hammer, CalendarDays, ArrowUpRight } from "lucide-react";

export const metadata = { title: "OX" };

const FEATURES = [
  {
    icon:  <Hammer      size={16} className="text-gold" />,
    title: "Maintenance Status",
    desc:  "Report equipment issues and view active work orders affecting your operations — readiness status sourced from MX.",
    href:  "/modules/ops/work-orders",
  },
  {
    icon:  <ClipboardList size={16} className="text-gold" />,
    title: "Requests",
    desc:  "Field-to-dispatcher workflow for masons, pump trucks, and equipment — approve and assign in one step.",
    href:  "/modules/ops/requests",
  },
  {
    icon:  <CalendarDays size={16} className="text-gold" />,
    title: "Pour Schedule",
    desc:  "Company-wide concrete pour coordination — yardage, pump requirements, and crew assignments across all jobsites.",
    href:  "/modules/ops/pour-schedule",
  },
];

export default function OpsPage() {
  return (
    <PageContainer>

      {/* ── Module Hero ─────────────────────────────────────────────────── */}
      <div
        className="rounded-[var(--radius-card)] border border-gold/30 bg-gradient-to-br from-surface-raised to-surface-overlay p-8 mb-6"
        style={{ boxShadow: "var(--shadow-card-gold)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-gold" />
          <span className="text-xs font-bold uppercase tracking-widest text-gold">Module · Operations</span>
        </div>
        <h1 className="text-2xl font-bold text-content-primary">OX</h1>
        <p className="text-content-secondary mt-2 max-w-md leading-relaxed">
          Operations and workflow engine. Coordinate field requests, concrete pours, and monitor maintenance impact across your entire organization.
        </p>
        <Link
          href="/modules/ops/work-orders"
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse text-sm font-semibold transition-colors"
        >
          View Maintenance Status <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* ── Feature Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
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
