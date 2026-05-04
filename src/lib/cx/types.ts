import type { WorkerRole } from "@/types/domain";

export type CxTaskType =
  | "pour"
  | "inspection"
  | "delivery"
  | "grading"
  | "concrete"
  | "framing"
  | "electrical"
  | "excavation"
  | "utility"
  | "paving"
  | "demolition"
  | "other";

export type CxTaskStatus =
  | "not_started"
  | "in_progress"
  | "on_hold"
  | "complete";

export type CxEventType =
  | "pour"
  | "inspection"
  | "delivery"
  | "grading"
  | "milestone"
  | "other";

export type CxStaffingStatus = "understaffed" | "staffed" | "overstaffed";

export interface CxCrewRequirement {
  role: WorkerRole;
  count: number;
}

export interface CxTask {
  id:                 string;
  projectId:          string;
  name:               string;
  type:               CxTaskType;
  startDate?:         string;   // YYYY-MM-DD — undefined = draft
  endDate?:           string;   // YYYY-MM-DD — undefined = draft
  location?:          string;
  status:             CxTaskStatus;
  crewRequirements:   CxCrewRequirement[];
  assignedWorkerIds:  string[];
  notes?:             string;
  externalId?:        string;   // Activity ID from imported schedule
  originalDuration?:  number;   // planned duration in workdays
  remainingDuration?: number;   // remaining duration in workdays
  predecessors:       string[]; // activity IDs this task depends on
  successors:         string[]; // activity IDs that depend on this task
}

export interface CxEvent {
  id:         string;
  projectId:  string;
  name:       string;
  type:       CxEventType;
  date:       string;   // YYYY-MM-DD
  time?:      string;   // HH:MM
  location?:  string;
  notes?:     string;
}

export interface CxDayAssignment {
  id:         string;
  workerId:   string;
  projectId:  string;
  date:       string;   // YYYY-MM-DD
}

export interface CreateCxTaskInput {
  projectId:          string;
  name:               string;
  type:               CxTaskType;
  startDate?:         string;
  endDate?:           string;
  location?:          string;
  status:             CxTaskStatus;
  crewRequirements:   CxCrewRequirement[];
  assignedWorkerIds:  string[];
  notes?:             string;
  externalId?:        string;
  originalDuration?:  number;
  remainingDuration?: number;
  predecessors:       string[];
  successors:         string[];
}
