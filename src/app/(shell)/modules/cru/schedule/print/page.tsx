"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import { GanttPanel } from "@/components/cx/GanttPanel";
import { localDateString } from "@/lib/utils/time";

function getMonday(dateStr: string): string {
  const d    = new Date(dateStr + "T12:00:00");
  const day  = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

export default function SchedulePrintPage() {
  const { workers, currentProject, projects } = useOrg();
  const { tasks } = useCx();

  const today  = useMemo(() => localDateString(), []);
  const monday = useMemo(() => getMonday(today), [today]);
  const endDate = useMemo(() => addDays(monday, 27), [monday]);

  const workingHolidayDates = projects.find((p) => p.id === currentProject.id)?.working_holiday_dates ?? [];

  const printDate = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <>
      <style>{`
        @page { size: 17in 11in landscape; margin: 0.5in; }
        @media print {
          html, body { background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="p-6 bg-white min-h-screen">
        {/* Toolbar — hidden in print */}
        <div className="no-print flex items-center justify-between mb-6">
          <Link
            href="/modules/cru/schedule"
            className="flex items-center gap-1.5 text-sm text-content-muted hover:text-content-primary transition-colors"
          >
            <ArrowLeft size={14} /> Back to Schedule
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-black text-sm font-semibold rounded hover:bg-gold/90 transition-colors"
          >
            <Printer size={14} /> Export PDF
          </button>
        </div>

        {/* Print header */}
        <div className="mb-4 border-b border-gray-200 pb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">
            4-Week Site Schedule
          </p>
          <h1 className="text-xl font-bold text-gray-900">{currentProject.name}</h1>
          <p className="text-sm text-gray-500">
            {formatDate(monday)} – {formatDate(endDate)} &nbsp;·&nbsp; Printed {printDate}
          </p>
        </div>

        {/* Full 28-day Gantt */}
        <GanttPanel
          tasks={tasks}
          projectId={currentProject.id}
          workers={workers}
          today={today}
          monday={monday}
          onTaskClick={() => {}}
          canEdit={false}
          workingHolidayDates={workingHolidayDates}
          days={28}
        />
      </div>
    </>
  );
}
