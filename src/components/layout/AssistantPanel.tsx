"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage, ChatStatus } from "ai";
import { X, Sparkles, Send, Building, FolderOpen, ChevronRight, Loader2 } from "lucide-react";
import { useUI }  from "@/providers/UIProvider";
import { useOrg } from "@/providers/OrgProvider";

const SUGGESTIONS = [
  "Summarize open issues on this project",
  "Show crew status for today",
  "Latest inspection findings",
];

export function AssistantPanel() {
  const { isAssistantOpen, closeAssistant } = useUI();
  const { currentOrganization, currentProject, currentUser, enabledModules } = useOrg();

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/assistant",
    body: {
      org: currentOrganization,
      project: currentProject,
      user: currentUser,
      enabledModules,
    },
  }), [currentOrganization, currentProject, currentUser, enabledModules]);

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport,
  });

  const [input, setInput] = useState("");
  const isLoading = status === "submitted" || status === "streaming";

  function handleSend(text: string) {
    if (!text.trim() || isLoading) return;
    clearError();
    sendMessage({ text });
    setInput("");
  }

  return (
    <>
      {/* Desktop: right slide-in */}
      <div className={`hidden md:flex flex-col fixed right-0 top-0 bottom-0 z-40 w-[400px] bg-surface-raised border-l border-surface-border shadow-[var(--shadow-panel)] transition-transform duration-200 ease-in-out ${isAssistantOpen ? "translate-x-0" : "translate-x-full"}`}>
        <AssistantContent
          orgName={currentOrganization.name}
          projectName={currentProject.name}
          messages={messages}
          input={input}
          isLoading={isLoading}
          error={error}
          status={status}
          onInputChange={setInput}
          onSend={handleSend}
          onClose={closeAssistant}
          suggestions={SUGGESTIONS}
        />
      </div>

      {/* Mobile: bottom sheet */}
      <div className={`md:hidden fixed inset-x-0 bottom-0 z-50 h-[70vh] bg-surface-raised border-t border-surface-border rounded-t-[var(--radius-card)] shadow-[var(--shadow-panel)] flex flex-col transition-transform duration-200 ease-in-out ${isAssistantOpen ? "translate-y-0" : "translate-y-full"}`}>
        <AssistantContent
          orgName={currentOrganization.name}
          projectName={currentProject.name}
          messages={messages}
          input={input}
          isLoading={isLoading}
          error={error}
          status={status}
          onInputChange={setInput}
          onSend={handleSend}
          onClose={closeAssistant}
          suggestions={SUGGESTIONS}
        />
      </div>

      {/* Overlay (mobile only) */}
      {isAssistantOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={closeAssistant} />
      )}
    </>
  );
}

interface ContentProps {
  orgName:      string;
  projectName:  string;
  messages:     UIMessage[];
  input:        string;
  isLoading:    boolean;
  error:        Error | undefined;
  status:       ChatStatus;
  onInputChange: (v: string) => void;
  onSend:       (text: string) => void;
  onClose:      () => void;
  suggestions:  string[];
}

function AssistantContent({ orgName, projectName, messages, input, isLoading, error, status, onInputChange, onSend, onClose, suggestions }: ContentProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-gold" />
          <span className="text-sm font-bold text-content-primary">AIGA Assistant</span>
          {isLoading && (
            <span className="flex items-center gap-1 text-[11px] text-gold">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              Generating…
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Context bar */}
      <div className="px-4 py-2.5 bg-surface-overlay border-b border-surface-border shrink-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] text-content-muted">
            <Building size={11} />
            <span className="font-medium text-content-secondary">{orgName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-content-muted">
            <FolderOpen size={11} />
            <span className="font-medium text-content-secondary">{projectName}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-content-secondary leading-relaxed">
              How can I help you with <span className="text-content-primary font-semibold">{projectName}</span> today?
            </p>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-content-muted">Suggestions</p>
              {suggestions.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSend(prompt)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-overlay border border-surface-border hover:border-gold/30 hover:bg-gold/5 text-left text-sm text-content-secondary hover:text-content-primary transition-colors"
                >
                  <span>{prompt}</span>
                  <ChevronRight size={12} className="shrink-0 text-content-muted" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const textContent = msg.parts
                .filter((p): p is { type: "text"; text: string } => p.type === "text")
                .map((p) => p.text)
                .join("");
              const isStreamingThis = status === "streaming" && msg.role === "assistant" && i === messages.length - 1;
              return (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-[var(--radius-card)] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-gold/15 text-content-primary border border-gold/20"
                      : "bg-surface-overlay border border-surface-border text-content-secondary"
                  }`}>
                    {textContent}
                    {isStreamingThis && (
                      <span className="inline-block w-0.5 h-3.5 bg-gold ml-0.5 align-middle animate-[blink_0.8s_step-end_infinite]" />
                    )}
                  </div>
                </div>
              );
            })}
            {error && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-[var(--radius-card)] px-3 py-2 text-sm leading-relaxed bg-surface-overlay border border-red-500/30 text-red-400">
                  Something went wrong — try again.
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-surface-border shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); onSend(input); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            disabled={isLoading}
            placeholder="Ask anything…"
            className="flex-1 bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-muted outline-none focus:border-gold/40 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gold hover:bg-gold-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading
              ? <Loader2 size={13} className="text-content-inverse animate-spin" />
              : <Send size={13} className="text-content-inverse" />
            }
          </button>
        </form>
      </div>
    </>
  );
}
