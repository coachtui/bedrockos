"use client";

import { useState, useCallback } from "react";
import type {
  ProjectSchedule, ScheduleMessage, ScheduleActivity,
  ColumnMap, ParsedIntentType,
} from "@/lib/schedule/types";
import {
  parseUserIntent, buildMarkCompleteProposal, buildPushDateProposal,
  applyMutations, generateWeeklyLookahead, makeMessageId,
  buildCascadeProposalBody,
} from "@/lib/schedule/agent";
import { applyColumnMap, parseCSVText } from "@/lib/schedule/csv-parser";
import {
  MOCK_PROJECT_SCHEDULE,
  MOCK_SCHEDULE_MESSAGES,
} from "@/lib/schedule/mock-data";

export function useSchedule(projectId: string) {
  const [schedule,  setSchedule]  = useState<ProjectSchedule>(MOCK_PROJECT_SCHEDULE);
  const [messages,  setMessages]  = useState<ScheduleMessage[]>(MOCK_SCHEDULE_MESSAGES);

  const activities = schedule.activities;

  // ── Upload ────────────────────────────────────────────────────────────────

  const uploadSchedule = useCallback(
    (csvText: string, columnMap: ColumnMap) => {
      const rows       = parseCSVText(csvText);
      const headers    = rows[0] ?? [];
      const parsed     = applyColumnMap(rows, headers, columnMap, projectId);
      const now        = new Date().toISOString();
      setSchedule((prev) => ({
        ...prev,
        activities:    parsed,
        columnMap,
        lastUpdatedAt: now,
        uploadedAt:    now,
      }));
    },
    [projectId],
  );

  // ── Lookahead ─────────────────────────────────────────────────────────────

  const generateLookahead = useCallback(() => {
    const today  = new Date().toISOString().split("T")[0];
    const { messageBody } = generateWeeklyLookahead(activities, today);
    const msg: ScheduleMessage = {
      id:        makeMessageId(),
      projectId,
      type:      "lookahead",
      author:    "agent",
      body:      messageBody,
      status:    "pending",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
  }, [activities, projectId]);

  // ── Mark complete ─────────────────────────────────────────────────────────

  const markActivityComplete = useCallback(
    (activityId: string) => {
      const today     = new Date().toISOString().split("T")[0];
      const mutations = buildMarkCompleteProposal(activityId, activities, today);

      // Apply the mark_complete mutation immediately
      const primaryMutation = mutations.filter((m) => m.type === "mark_complete");
      setSchedule((prev) => ({
        ...prev,
        activities:    applyMutations(prev.activities, primaryMutation),
        lastUpdatedAt: new Date().toISOString(),
      }));

      const cascadeMutations = mutations.filter((m) => m.type !== "mark_complete");
      if (cascadeMutations.length > 0) {
        const proposalBody = buildCascadeProposalBody(mutations, activities);
        const proposal: ScheduleMessage = {
          id:        makeMessageId(),
          projectId,
          type:      "cascade_proposal",
          author:    "agent",
          body:      proposalBody,
          payload:   cascadeMutations,
          status:    "pending",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, proposal]);
      } else {
        const a = activities.find((x) => x.id === activityId);
        const confirmation: ScheduleMessage = {
          id:        makeMessageId(),
          projectId,
          type:      "confirmation",
          author:    "agent",
          body:      `✓ **${a?.name}** marked complete.`,
          status:    "confirmed",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, confirmation]);
      }
    },
    [activities, projectId],
  );

  // ── Push date ─────────────────────────────────────────────────────────────

  const pushActivity = useCallback(
    (activityId: string, days: number) => {
      const mutations    = buildPushDateProposal(activityId, days, activities);
      const proposalBody = buildCascadeProposalBody(mutations, activities);
      const proposal: ScheduleMessage = {
        id:        makeMessageId(),
        projectId,
        type:      "cascade_proposal",
        author:    "agent",
        body:      proposalBody,
        payload:   mutations,
        status:    "pending",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, proposal]);
    },
    [activities, projectId],
  );

  // ── Confirm / dismiss cascade ─────────────────────────────────────────────

  const confirmCascade = useCallback(
    (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg?.payload) return;

      setSchedule((prev) => ({
        ...prev,
        activities:    applyMutations(prev.activities, msg.payload!),
        lastUpdatedAt: new Date().toISOString(),
      }));

      const count = msg.payload.length;
      setMessages((prev) => [
        ...prev.map((m) => m.id === messageId ? { ...m, status: "confirmed" as const } : m),
        {
          id:        makeMessageId(),
          projectId,
          type:      "confirmation" as const,
          author:    "agent",
          body:      `✓ ${count} activit${count !== 1 ? "ies" : "y"} updated.`,
          status:    "confirmed" as const,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [messages, projectId],
  );

  const dismissCascade = useCallback(
    (messageId: string) => {
      setMessages((prev) =>
        prev.map((m) => m.id === messageId ? { ...m, status: "dismissed" as const } : m),
      );
    },
    [],
  );

  // ── Post free-text message ────────────────────────────────────────────────

  const postMessage = useCallback(
    (text: string) => {
      const userMsg: ScheduleMessage = {
        id:        makeMessageId(),
        projectId,
        type:      "user_update",
        author:    "user",
        body:      text,
        status:    "confirmed",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const intent = parseUserIntent(text, activities);

      if (intent.type === "mark_complete" && intent.activityId) {
        markActivityComplete(intent.activityId);
      } else if (intent.type === "push_date" && intent.activityId) {
        pushActivity(intent.activityId, intent.days ?? 7);
      }
      // add_note: user message is already posted, no agent action
    },
    [activities, projectId, markActivityComplete, pushActivity],
  );

  return {
    schedule,
    activities,
    messages,
    uploadSchedule,
    generateLookahead,
    markActivityComplete,
    pushActivity,
    confirmCascade,
    dismissCascade,
    postMessage,
  };
}
