"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TaskInspectorPanel } from "@/components/cx/TaskInspectorPanel";
import { CsvImportModal } from "@/components/cx/CsvImportModal";
import { useOrg } from "@/providers/OrgProvider";
import { useCx } from "@/providers/CxProvider";
import type { CxTask, CreateCxTaskInput } from "@/lib/cx/types";
import { ArrowLeft, Plus, Upload } from "lucide-react";

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

export default function TaskBankPage() {
  const { currentProject, role } = useOrg();
  const { tasks, addTask, addTasks, updateTask } = useCx();

  const [panelOpen,      setPanelOpen]      = useState(false);
  const [importOpen,     setImportOpen]     = useState(false);
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

  const canEdit = role === "project_engineer" || role === "superintendent" || role === "owner" || role === "admin";

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
      <div className="mb-4">
        <Link href="/modules/cru" className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors">
          <ArrowLeft size={12} /> CX
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
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
