"use client";

import { useOrg } from "@/providers/OrgProvider";
import type { ModuleId } from "@/types/org";
import type { IssueSeverity } from "@/types/domain";

export interface CreateIssueInput {
  title:               string;
  module:              ModuleId;
  severity:            IssueSeverity;
  projectId:           string;
  assetId?:            string;
  description?:        string;
  relatedWorkOrderId?: string;
  relatedTaskId?:      string;
  photoPaths?:         string[];
}

export interface CreateActivityInput {
  actorName:   string;
  action:      string;
  entityType:  string;
  entityName:  string;
  projectId:   string;
  module:      ModuleId | "shell";
  targetType?: "issue" | "alert" | "asset" | "project";
  targetId?:   string;
}

/**
 * Gives modules a typed write path back to the shell.
 * Phase 1: mutates OrgProvider in-memory state.
 * Phase 3: calls API and persists to Supabase.
 */
export function useShellEmitter() {
  const { addEmittedIssue, addEmittedActivity, currentUser } = useOrg();

  /** Emits an issue to the shell. Returns the new issue ID. */
  function emitIssue(input: CreateIssueInput): string {
    const id = crypto.randomUUID();
    addEmittedIssue({
      id,
      title:                 input.title,
      module:                input.module,
      severity:              input.severity,
      project_id:            input.projectId,
      created_at:            new Date().toISOString(),
      assignee_name:         null,
      status:                "open",
      asset_id:              input.assetId,
      description:           input.description,
      related_work_order_id: input.relatedWorkOrderId,
      related_task_id:       input.relatedTaskId,
      photo_paths:           input.photoPaths,
    });
    return id;
  }

  /** Emits an activity event to the shell. */
  function emitActivity(input: CreateActivityInput): void {
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  input.actorName,
      action:      input.action,
      entity_type: input.entityType,
      entity_name: input.entityName,
      project_id:  input.projectId,
      module:      input.module,
      timestamp:   new Date().toISOString(),
      target_type: input.targetType,
      target_id:   input.targetId,
    });
  }

  return { emitIssue, emitActivity, currentUser };
}
