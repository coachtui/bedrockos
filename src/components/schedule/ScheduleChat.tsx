"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, RefreshCw } from "lucide-react";
import type { ScheduleMessage, ScheduleActivity } from "@/lib/schedule/types";
import { LookaheadCard }       from "./LookaheadCard";
import { CascadeProposalCard } from "./CascadeProposalCard";
import { ResourceAlertCard }   from "./ResourceAlertCard";
import { getWeekBuckets }      from "@/lib/schedule/utils";

interface Props {
  messages:           ScheduleMessage[];
  activities:         ScheduleActivity[];
  canAct:             boolean;
  onPostMessage:      (text: string) => void;
  onMarkComplete:     (activityId: string) => void;
  onPush:             (activityId: string, days: number) => void;
  onConfirmCascade:   (messageId: string) => void;
  onDismissCascade:   (messageId: string) => void;
  onGenerateLookahead: () => void;
}

function ConfirmationBubble({ message }: { message: ScheduleMessage }) {
  return (
    <div className="flex justify-start">
      <p className="text-[11px] text-content-muted italic">{message.body}</p>
    </div>
  );
}

function UserBubble({ message }: { message: ScheduleMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-surface-raised border border-surface-border rounded-[var(--radius-card)] px-3 py-2">
        <p className="text-[12px] text-content-primary">{message.body}</p>
        <p className="text-[10px] text-content-muted mt-1 text-right">
          {new Date(message.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export function ScheduleChat({
  messages, activities, canAct,
  onPostMessage, onMarkComplete, onPush,
  onConfirmCascade, onDismissCascade, onGenerateLookahead,
}: Props) {
  const [input,    setInput]    = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const today     = new Date().toISOString().split("T")[0];
  const buckets   = getWeekBuckets(activities, today);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onPostMessage(text);
    setInput("");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border shrink-0">
        <Bot size={14} className="text-teal" />
        <span className="text-xs font-semibold text-content-primary">Schedule Chat</span>
        {canAct && (
          <button
            onClick={onGenerateLookahead}
            title="Generate this week's lookahead"
            className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-content-muted border border-surface-border rounded px-2 py-1 hover:border-teal/40 hover:text-teal transition-colors"
          >
            <RefreshCw size={10} /> Weekly Update
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-content-muted text-center mt-8">
            No messages yet. Generate a weekly update to start.
          </p>
        )}
        {messages.map((msg) => {
          if (msg.type === "lookahead") {
            return (
              <LookaheadCard
                key={msg.id}
                message={msg}
                week1Activities={buckets[0]?.activities ?? []}
                week2Activities={buckets[1]?.activities ?? []}
                week3Activities={buckets[2]?.activities ?? []}
                canAct={canAct}
                onMarkComplete={onMarkComplete}
                onPush={onPush}
              />
            );
          }
          if (msg.type === "resource_alert") {
            return <ResourceAlertCard key={msg.id} message={msg} />;
          }
          if (msg.type === "cascade_proposal") {
            return (
              <CascadeProposalCard
                key={msg.id}
                message={msg}
                onConfirm={onConfirmCascade}
                onDismiss={onDismissCascade}
              />
            );
          }
          if (msg.type === "user_update") {
            return <UserBubble key={msg.id} message={msg} />;
          }
          if (msg.type === "confirmation") {
            return <ConfirmationBubble key={msg.id} message={msg} />;
          }
          return null;
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-surface-border shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Update the schedule — e.g. 'Formwork is done' or 'Push rebar out a week'"
          className="flex-1 text-xs bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-teal/50"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-teal text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}
