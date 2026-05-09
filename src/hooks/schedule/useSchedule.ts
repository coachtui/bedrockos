"use client";

import { useState, useCallback } from "react";
import type {
  ProjectSchedule, ScheduleMessage,
  ColumnMap,
} from "@/lib/schedule/types";
import {
  buildMarkCompleteProposal, buildPushDateProposal,
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
    async (text: string) => {
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

      try {
        const res = await fetch("/api/schedule/chat", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ message: text, activities, projectId }),
        });

        if (!res.ok) throw new Error(`API error ${res.status}`);

        const { intent_type, activity_id, days, reply } = await res.json() as {
          intent_type:  "mark_complete" | "push_date" | "add_note";
          activity_id:  string | null;
          days:         number | null;
          reply:        string;
        };

        if (intent_type === "mark_complete" && activity_id) {
          markActivityComplete(activity_id);
        } else if (intent_type === "push_date" && activity_id) {
          pushActivity(activity_id, days ?? 7);
        } else {
          const replyMsg: ScheduleMessage = {
            id:        makeMessageId(),
            projectId,
            type:      "confirmation",
            author:    "agent",
            body:      reply,
            status:    "confirmed",
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, replyMsg]);
        }
      } catch {
        const errMsg: ScheduleMessage = {
          id:        makeMessageId(),
          projectId,
          type:      "confirmation",
          author:    "agent",
          body:      "Couldn't reach the schedule assistant. Try again.",
          status:    "confirmed",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
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
