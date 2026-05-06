import type { CxTask, CxStaffingStatus } from "./types";
import type { OrgWorker, WorkerRole } from "@/types/domain";

export function getStaffingStatus(
  tasks: CxTask[],
  date: string,
  workers: OrgWorker[],
): CxStaffingStatus {
  const required: Partial<Record<WorkerRole, number>> = {};
  const assigned: Partial<Record<WorkerRole, number>> = {};

  for (const task of tasks) {
    if (!task.startDate || !task.endDate || task.startDate > date || task.endDate < date) continue;
    if (task.status === "complete" || task.status === "on_hold") continue;

    for (const req of task.crewRequirements) {
      required[req.role] = (required[req.role] ?? 0) + req.count;
    }
    for (const wid of task.assignedWorkerIds) {
      const worker = workers.find((w) => w.id === wid);
      if (worker) {
        assigned[worker.role] = (assigned[worker.role] ?? 0) + 1;
      }
    }
  }

  const totalRequired = Object.values(required).reduce((s, n) => s + n, 0);
  if (totalRequired === 0) return "staffed";

  let gap = 0;
  for (const role of Object.keys(required) as WorkerRole[]) {
    gap += (required[role] ?? 0) - (assigned[role] ?? 0);
  }

  if (gap > 0) return "understaffed";
  if (gap < 0) return "overstaffed";
  return "staffed";
}

export const STAFFING_LABEL: Record<CxStaffingStatus, string> = {
  understaffed: "Understaffed",
  staffed: "Staffed",
  overstaffed: "Overstaffed",
};

export const STAFFING_COLOR: Record<CxStaffingStatus, string> = {
  understaffed: "text-red-400 bg-red-400/10 border-red-400/30",
  staffed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  overstaffed: "text-gold bg-gold/10 border-gold/30",
};
