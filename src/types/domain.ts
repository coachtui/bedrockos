import type { ModuleId } from "./org";

export type ProjectStatus = "active" | "on_hold" | "completed" | "planning";
export type IssueSeverity  = "critical" | "high" | "medium" | "low";
export type AlertType      = "safety" | "schedule" | "equipment" | "budget" | "inspection";
export type AlertSeverity  = "critical" | "warning" | "info";
export type IssueStatus    = "open" | "in_progress" | "resolved";
export type AssetStatus    = "active" | "maintenance" | "offline";
export type CrewStatus     = "on_site" | "off_site";

export interface Project {
  id:            string;
  name:          string;
  slug:          string;
  status:        ProjectStatus;
  phase:         string;
  location:      string;
  pm_name:       string;
  progress_pct:  number;
  open_issues:   number;
  last_activity: string;
  start_date:    string;
  end_date:      string;
  description?:          string;
  award_price?:          number;
  working_holiday_dates: string[];
}

export interface Issue {
  id:              string;
  title:           string;
  module:          ModuleId;
  severity:        IssueSeverity;
  project_id:      string;
  project_name?:   string;
  created_at:      string;
  assignee_name:   string | null;
  status:          IssueStatus;
  /* Enriched context */
  asset_id?:               string;
  asset_name?:             string;
  inspection_id?:          string;
  description?:            string;
  related_work_order_id?:  string;
}

export interface Alert {
  id:                string;
  type:              AlertType;
  severity:          AlertSeverity;
  message:           string;
  project_id:        string;
  project_name?:     string;
  created_at:        string;
  is_read:           boolean;
  /* Enriched context */
  related_issue_id?: string;
  description?:      string;
}

export interface ActivityEvent {
  id:           string;
  actor_name:   string;
  action:       string;
  entity_type:  string;
  entity_id?:   string;
  entity_name:  string;
  project_id:   string;
  module:       ModuleId | "shell";
  timestamp:    string;
  /* Routing context */
  target_type?: "issue" | "alert" | "asset" | "project";
  target_id?:   string;
}

export interface Asset {
  id:         string;
  name:       string;
  type:       string;
  status:     AssetStatus;
  project_id: string;
  last_seen:  string;
}

export interface Crew {
  id:         string;
  name:       string;
  lead_name:  string;
  headcount:  number;
  project_id: string;
  status:     CrewStatus;
}

export interface User {
  id:    string;
  name:  string;
  email: string;
  role:  string;
}

export type WorkerRole =
  | "mechanic"
  | "driver"
  | "mason"
  | "carpenter"
  | "foreman"
  | "superintendent"
  | "operator"
  | "laborer";

export type ProjectPosition = "superintendent" | "foreman";

export interface WorkerProjectRole {
  id:        string;
  orgId:     string;
  workerId:  string;
  projectId: string;
  position:  ProjectPosition;
}

export interface OrgWorker {
  id:        string;
  orgId:     string;
  name:      string;
  role:      WorkerRole;
  userId:    string | null;  // null until worker has an AIGACP login
  available: boolean;
  skills:    string[];
  projectId?: string;
  siteName?:  string;
}

export interface OrgCrew {
  id:        string;
  orgId:     string;
  projectId: string;
  name:      string;
  memberIds: string[];   // OrgWorker ids
  // Preserved from seeded data; undefined for user-created crews
  leadName?: string;
  status?:   CrewStatus;
}

export interface CreateProjectInput {
  name:      string;
  location:  string;
  phase:     string;
  pmName:    string;
  startDate: string;  // YYYY-MM-DD
  endDate:   string;  // YYYY-MM-DD
  description?: string;
  awardPrice?:  number;
}

export type UpdateProjectInput = Partial<Pick<Project,
  "name" | "location" | "phase" | "pm_name" | "status" |
  "start_date" | "end_date" | "description" | "award_price" |
  "working_holiday_dates"
>>;

export interface CreateAssetInput {
  name:      string;
  type:      string;
  status:    AssetStatus;
  projectId: string;
}

export interface CreateCrewInput {
  name:      string;
  projectId: string;
  memberIds: string[];
}

export interface CreateWorkerInput {
  name:   string;
  role:   WorkerRole;
  skills: string[];
}

export interface ProjectFile {
  id:          string;
  orgId:       string;
  projectId:   string;
  storagePath: string;
  fileName:    string;
  fileSize:    number;    // bytes
  mimeType:    string;
  uploadedBy:  string;   // display name
  uploadedAt:  string;   // ISO 8601 string
}
