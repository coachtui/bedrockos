export type ScheduleActivityStatus = "upcoming" | "active" | "complete" | "delayed";

export interface ScheduleActivity {
  id:           string;
  projectId:    string;
  name:         string;
  phase:        string;
  startDate:    string;   // "YYYY-MM-DD"
  endDate:      string;   // "YYYY-MM-DD"
  duration:     number;   // calendar days
  status:       ScheduleActivityStatus;
  completedAt?: string;
  pushedDays?:  number;   // running tally of days pushed
  notes:        string[];
}

export type ScheduleMessageType =
  | "lookahead"
  | "resource_alert"
  | "cascade_proposal"
  | "user_update"
  | "confirmation";

export type MutationType = "mark_complete" | "push_date" | "pull_forward";

export interface ScheduleMutation {
  activityId:    string;
  type:          MutationType;
  newStartDate?: string;
  newEndDate?:   string;
  completedAt?:  string;
}

export interface ScheduleMessage {
  id:        string;
  projectId: string;
  type:      ScheduleMessageType;
  author:    "agent" | string;
  body:      string;
  payload?:  ScheduleMutation[];
  status:    "pending" | "confirmed" | "dismissed";
  createdAt: string;
}

export interface ProjectSchedule {
  id:            string;
  projectId:     string;
  uploadedAt:    string;
  columnMap:     ColumnMap;
  activities:    ScheduleActivity[];
  lastUpdatedAt: string;
}

export interface ColumnMap {
  activityName: string;
  phase:        string;
  startDate:    string;
  endDate:      string;
  duration?:    string;
}

export type ParsedIntentType = "mark_complete" | "push_date" | "add_note";

export interface ParsedIntent {
  type:        ParsedIntentType;
  activityId?: string;
  days?:       number;
  rawText:     string;
}

export interface WeekBucket {
  label:      string;   // "Week 1", "Week 2", "Week 3"
  startDate:  string;
  endDate:    string;
  activities: ScheduleActivity[];
}
