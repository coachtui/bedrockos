"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TaskInspectorPanel } from "@/components/cx/TaskInspectorPanel";
import { GanttPanel } from "@/components/cx/GanttPanel";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import { localDateString } from "@/lib/utils/time";
import type { CxTask, CxEvent, CreateCxTaskInput } from "@/lib/cx/types";
import { ArrowLeft, Plus, CalendarDays, BarChart2 } from "lucide-react";

// ── Date helpers ──────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function getMonday(dateStr: string): string {
  const d    = new Date(dateStr + "T12:00:00");
  const day  = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

function formatDayHeader(dateStr: string): { dow: string; date: string } {
  const d = new Date(dateStr + "T12:00:00");
  return {
    dow:  d.toLocaleDateString("en-US", { weekday: "short" }),
    date: d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
  };
}

// ── Event type colors ─────────────────────────────────────────────────────────

const EVENT_TYPE_COLOR: Record<string, string> = {
  pour:       "bg-blue-500/15 border-blue-500/30 text-blue-400",
  inspection: "bg-amber-500/15 border-amber-500/30 text-amber-400",
  delivery:   "bg-purple-500/15 border-purple-500/30 text-purple-400",
  grading:    "bg-orange-500/15 border-orange-500/30 text-orange-400",
  milestone:  "bg-gold/15 border-gold/30 text-gold",
  other:      "bg-surface-overlay border-surface-border text-content-muted",
};

// ── Calendar View ─────────────────────────────────────────────────────────────

function CalendarView({ events, tasks, projectId, today, monday }: {
  events:    CxEvent[];
  tasks:     CxTask[];
  projectId: string;
  today:     string;
  monday:    string;
}) {
  const allDates = Array.from({ length: 28 }, (_, i) => addDays(monday, i));
  const weeks = [
    allDates.slice(0,  7),
    allDates.slice(7,  14),
    allDates.slice(14, 21),
    allDates.slice(21, 28),
  ];
  const projectEvents = events.filter((e) => e.projectId === projectId);
  const activeTasks   = tasks.filter(
    (t): t is CxTask & { startDate: string; endDate: string } =>
      t.projectId === projectId &&
      t.status !== "complete" &&
      !!t.startDate &&
      !!t.endDate,
  );

  return (
    <div className="mt-4 space-y-4">
      {weeks.map((week, wi) => (
        <div key={wi}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-2">
            {wi === 0 ? "This Week" : wi === 1 ? "Next Week" : `Week of ${formatShortDate(week[0])}`}
          </p>
          <div className="grid grid-cols-7 gap-1">
            {week.map((date) => {
              const dayEvents = projectEvents.filter((e) => e.date === date);
              const dayTasks  = activeTasks.filter((t) => date >= t.startDate && date <= t.endDate);
              const isToday   = date === today;
              return (
                <div
                  key={date}
                  className={`min-h-[72px] rounded-lg border p-1.5 ${
                    isToday
                      ? "border-gold/40 bg-gold/5"
                      : "border-surface-border bg-surface-raised"
                  }`}
                >
                  <p className={`text-[10px] font-semibold mb-1 ${isToday ? "text-gold" : "text-content-muted"}`}>
                    {formatShortDate(date)}
                  </p>
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded border mb-0.5 truncate bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      title={t.name}
                    >
                      {t.name}
                    </div>
                  ))}
                  {dayEvents.map((e) => (
                    <div
                      key={e.id}
                      className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border mb-0.5 truncate ${EVENT_TYPE_COLOR[e.type] ?? EVENT_TYPE_COLOR.other}`}
                      title={e.name}
                    >
                      {e.name}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type ScheduleTab = "calendar" | "gantt";

export default function SchedulePage() {
  const { workers, currentProject, role } = useOrg();
  const { tasks, events, addTask, updateTask } = useCx();

  const today  = useMemo(() => localDateString(), []);
  const monday = useMemo(() => getMonday(today), [today]);

  const [tab,          setTab]          = useState<ScheduleTab>("calendar");
  const [panelOpen,      setPanelOpen]    = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : undefined;

  const canEdit = role === "project_engineer" || role === "superintendent" || role === "owner" || role === "admin";

  function openCreate() {
    setSelectedTaskId(undefined);
    setPanelOpen(true);
  }

  function openEdit(task: CxTask) {
    if (!canEdit) return;
    setSelectedTaskId(task.id);
    setPanelOpen(true);
  }

  function handleSave(data: CreateCxTaskInput) {
    if (selectedTaskId) {
      updateTask(selectedTaskId, data);
    } else {
      addTask(data);
    }
  }

  return (
    <PageContainer maxWidth="wide">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/modules/cru" className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors">
          <ArrowLeft size={12} /> CX
        </Link>
        <Link href="/modules/cru/task-bank" className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors">
          Task Bank <ArrowLeft size={12} className="rotate-180" />
        </Link>
      </div>

      <SectionHeader
        title="Site Schedule"
        subtitle={`${currentProject.name} · 4-week view`}
        action={
          canEdit ? (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
            >
              <Plus size={13} /> Add Task
            </button>
          ) : undefined
        }
      />

      {/* View toggle */}
      <div className="flex gap-1 mt-4 mb-2 p-1 bg-surface-overlay rounded-lg w-fit">
        {(["calendar", "gantt"] as ScheduleTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
              tab === t
                ? "bg-gold text-black"
                : "text-content-muted hover:text-content-primary"
            }`}
          >
            {t === "calendar" ? <CalendarDays size={13} /> : <BarChart2 size={13} />}
            {t === "calendar" ? "Calendar" : "Gantt"}
          </button>
        ))}
      </div>

      {tab === "calendar" ? (
        <CalendarView
          events={events}
          tasks={tasks}
          projectId={currentProject.id}
          today={today}
          monday={monday}
        />
      ) : (
        <div className="mt-4">
          <GanttPanel
            tasks={tasks}
            projectId={currentProject.id}
            workers={workers}
            today={today}
            monday={monday}
            onTaskClick={openEdit}
            canEdit={canEdit}
          />
        </div>
      )}

      <TaskInspectorPanel
        open={panelOpen}
        onClose={() => { setPanelOpen(false); setSelectedTaskId(undefined); }}
        projectId={currentProject.id}
        task={selectedTask}
        onSave={handleSave}
      />
    </PageContainer>
  );
}
