"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TaskInspectorPanel } from "@/components/cx/TaskInspectorPanel";
import { CsvImportModal } from "@/components/cx/CsvImportModal";
import { GanttPanel } from "@/components/cx/GanttPanel";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import { localDateString } from "@/lib/utils/time";
import type { CxTask, CreateCxTaskInput } from "@/lib/cx/types";
import { ArrowLeft, Plus, Upload, BarChart2, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  on_hold:     "On Hold",
  complete:    "Complete",
};

const TYPE_LABEL: Record<string, string> = {
  pour:        "Pour",
  inspection:  "Inspection",
  delivery:    "Delivery",
  grading:     "Grading",
  concrete:    "Concrete Work",
  framing:     "Framing",
  electrical:  "Electrical",
  excavation:  "Excavation",
  utility:     "Utility Work",
  paving:      "Paving",
  demolition:  "Demolition",
  other:       "Other",
};

function getMonday(dateStr: string): string {
  const d    = new Date(dateStr + "T12:00:00");
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

export default function TaskBankPage() {
  const { currentProject, workers, role } = useOrg();
  const { tasks, addTask, addTasks, updateTask } = useCx();

  const today  = useMemo(() => localDateString(), []);
  const monday = useMemo(() => getMonday(today), [today]);

  const [panelOpen,      setPanelOpen]      = useState(false);
  const [importOpen,     setImportOpen]     = useState(false);
  const [ganttOpen,      setGanttOpen]      = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : undefined;

  const projectTasks = tasks
    .filter((t) => t.projectId === currentProject.id)
    .sort((a, b) => {
      if (!a.startDate && b.startDate)  return -1;
      if (a.startDate  && !b.startDate) return 1;
      if (a.startDate  && b.startDate)  return a.startDate.localeCompare(b.startDate);
      return a.name.localeCompare(b.name);
    });

  const canEdit = role === "project_engineer" || role === "superintendent" || role === "owner" || role === "admin" || role === "equipment_director" || role === "operations_manager";

  function openCreate() {
    setSelectedTaskId(undefined);
    setPanelOpen(true);
  }

  function openEdit(task: CxTask) {
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

  const draftCount     = projectTasks.filter((t) => !t.startDate).length;
  const scheduledCount = projectTasks.filter((t) =>  t.startDate).length;

  return (
    <PageContainer maxWidth="wide">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/modules/cru" className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors">
          <ArrowLeft size={12} /> CX
        </Link>
        <Link href="/modules/cru/schedule" className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors">
          Schedule <ArrowLeft size={12} className="rotate-180" />
        </Link>
      </div>

      <SectionHeader
        title="Task Bank"
        subtitle={`${currentProject.name} · ${scheduledCount} scheduled · ${draftCount} draft${draftCount !== 1 ? "s" : ""}`}
        action={
          canEdit ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-surface-border text-content-secondary hover:text-content-primary hover:border-gold/40 rounded transition-colors"
              >
                <Upload size={13} /> Import CSV
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 min-h-11 md:min-h-0 px-4 md:px-3 py-2 md:py-1.5 text-sm md:text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 active:opacity-80 transition-colors"
              >
                <Plus size={13} /> New Draft
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="mt-4">
        {projectTasks.length === 0 ? (
          <p className="text-sm text-content-muted py-12 text-center">
            No tasks yet. Import a CSV or create a draft to get started.
          </p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2 pr-4">Task</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2 pr-4">Type</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2 pr-4">Dates</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2 pr-4">Status</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted pb-2">ID</th>
              </tr>
            </thead>
            <tbody>
              {projectTasks.map((task) => {
                const isDraft = !task.startDate;
                return (
                  <tr
                    key={task.id}
                    onClick={() => openEdit(task)}
                    className="border-b border-surface-border hover:bg-surface-raised/50 cursor-pointer group"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-content-primary group-hover:text-gold transition-colors">
                          {task.name}
                        </p>
                        {isDraft && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400">
                            Draft
                          </span>
                        )}
                      </div>
                      {task.location && (
                        <p className="text-[10px] text-content-muted mt-0.5">{task.location}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs text-content-muted">
                      {TYPE_LABEL[task.type] ?? task.type}
                    </td>
                    <td className="py-3 pr-4 text-xs text-content-muted">
                      {task.startDate
                        ? `${task.startDate}${task.endDate !== task.startDate ? ` → ${task.endDate}` : ""}`
                        : <span className="text-content-muted italic">Unscheduled</span>
                      }
                    </td>
                    <td className="py-3 pr-4 text-xs text-content-muted">
                      {STATUS_LABEL[task.status] ?? task.status}
                    </td>
                    <td className="py-3 text-xs text-content-muted font-mono">
                      {task.externalId ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Schedule toggle */}
      <div className="mt-6">
        <button
          onClick={() => setGanttOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-content-muted hover:text-content-primary transition-colors"
        >
          <BarChart2 size={13} />
          {ganttOpen ? "Hide Schedule" : "Show Schedule"}
          {ganttOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {ganttOpen && (
          <div className="mt-3 border border-surface-border rounded-xl p-4 bg-surface-raised">
            <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              2-Week Gantt · Set dates on draft tasks to schedule them
            </p>
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
      </div>

      <TaskInspectorPanel
        open={panelOpen}
        onClose={() => { setPanelOpen(false); setSelectedTaskId(undefined); }}
        projectId={currentProject.id}
        task={selectedTask}
        onSave={handleSave}
      />

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        projectId={currentProject.id}
        onImport={(inputs) => addTasks(inputs)}
      />
    </PageContainer>
  );
}
