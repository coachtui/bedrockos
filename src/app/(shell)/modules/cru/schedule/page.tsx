"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StaffingBadge } from "@/components/cx/StaffingBadge";
import { TaskInspectorPanel } from "@/components/cx/TaskInspectorPanel";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import { getStaffingStatus } from "@/lib/cx/staffing";
import type { CxTask, CxEvent, CreateCxTaskInput } from "@/lib/cx/types";
import { ArrowLeft, Plus, CalendarDays, BarChart2, MapPin } from "lucide-react";

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

function CalendarView({ events, projectId, today, monday }: {
  events:    CxEvent[];
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

// ── Gantt View ────────────────────────────────────────────────────────────────

function GanttView({ tasks, projectId, workers, today, monday, onTaskClick }: {
  tasks:       CxTask[];
  projectId:   string;
  workers:     ReturnType<typeof useOrg>["workers"];
  today:       string;
  monday:      string;
  onTaskClick: (task: CxTask) => void;
}) {
  const ganttDates   = Array.from({ length: 14 }, (_, i) => addDays(monday, i));
  const projectTasks = tasks.filter((t) => t.projectId === projectId && t.status !== "complete");

  return (
    <div className="mt-4 overflow-x-auto">
      <div style={{ minWidth: "700px" }}>
        {/* Date header */}
        <div className="flex border-b border-surface-border">
          <div className="w-40 flex-shrink-0" />
          {ganttDates.map((date) => {
            const { dow, date: dateNum } = formatDayHeader(date);
            const staffing = getStaffingStatus(projectTasks, date, workers);
            return (
              <div
                key={date}
                className={`flex-1 text-center py-1 px-0.5 border-l border-surface-border ${date === today ? "bg-gold/5" : ""}`}
              >
                <p className={`text-[9px] font-bold ${date === today ? "text-gold" : "text-content-muted"}`}>{dow}</p>
                <p className={`text-[9px] ${date === today ? "text-gold" : "text-content-muted"}`}>{dateNum}</p>
                <div className="mt-0.5 flex justify-center">
                  <StaffingBadge status={staffing} size="xs" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Task rows */}
        {projectTasks.map((task) => (
          <div key={task.id} className="flex border-b border-surface-border hover:bg-surface-raised/50 group">
            <div
              className="w-40 flex-shrink-0 px-2 py-2 cursor-pointer"
              onClick={() => onTaskClick(task)}
            >
              <p className="text-xs font-semibold text-content-primary truncate group-hover:text-gold transition-colors">
                {task.name}
              </p>
              {task.location && (
                <p className="text-[9px] text-content-muted flex items-center gap-0.5 mt-0.5">
                  <MapPin size={8} />{task.location}
                </p>
              )}
            </div>
            {ganttDates.map((date) => {
              const active  = date >= task.startDate && date <= task.endDate;
              const isStart = date === task.startDate;
              const isEnd   = date === task.endDate;
              return (
                <div
                  key={date}
                  className={`flex-1 border-l border-surface-border py-2 flex items-center ${date === today ? "bg-gold/5" : ""}`}
                >
                  {active && (
                    <div
                      className={[
                        "h-4 w-full bg-gold/25 border-t border-b border-gold/40",
                        isStart ? "rounded-l-full ml-1 border-l border-gold/40" : "",
                        isEnd   ? "rounded-r-full mr-1 border-r border-gold/40" : "",
                      ].join(" ")}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {projectTasks.length === 0 && (
          <p className="text-sm text-content-muted py-8 text-center">
            No active tasks. Create one to see it on the Gantt.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type ScheduleTab = "calendar" | "gantt";

export default function SchedulePage() {
  const { workers, currentProject, role } = useOrg();
  const { tasks, events, addTask, updateTask } = useCx();

  const today  = useMemo(() => new Date().toISOString().split("T")[0], []);
  const monday = useMemo(() => getMonday(today), [today]);

  const [tab,          setTab]          = useState<ScheduleTab>("calendar");
  const [panelOpen,    setPanelOpen]    = useState(false);
  const [selectedTask, setSelectedTask] = useState<CxTask | undefined>();

  const canEdit = role === "project_engineer" || role === "superintendent" || role === "owner" || role === "admin";

  function openCreate() {
    setSelectedTask(undefined);
    setPanelOpen(true);
  }

  function openEdit(task: CxTask) {
    if (!canEdit) return;
    setSelectedTask(task);
    setPanelOpen(true);
  }

  function handleSave(data: CreateCxTaskInput) {
    if (selectedTask) {
      updateTask(selectedTask.id, data);
    } else {
      addTask(data);
    }
  }

  return (
    <PageContainer maxWidth="wide">
      <div className="mb-4">
        <Link href="/modules/cru" className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors">
          <ArrowLeft size={12} /> CX
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
          projectId={currentProject.id}
          today={today}
          monday={monday}
        />
      ) : (
        <GanttView
          tasks={tasks}
          projectId={currentProject.id}
          workers={workers}
          today={today}
          monday={monday}
          onTaskClick={openEdit}
        />
      )}

      <TaskInspectorPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        projectId={currentProject.id}
        task={selectedTask}
        onSave={handleSave}
      />
    </PageContainer>
  );
}
