"use client";

import { useEffect, useRef, useState, Fragment } from "react";
import { History, Image as ImageIcon, Plus, Send, Trash2, X } from "lucide-react";
import {
  completeSession, createSession, deleteSession, getSession, listSessions,
  lookupOBDCode, sendMessage, uploadImage,
} from "@/lib/fix/api";
import type {
  ChatMessage, HeavyEquipmentContext, SessionMode, SessionSummary,
} from "@/lib/fix/types";
import { FixHeavyContextForm } from "./FixHeavyContextForm";
import { FixDiagnosticResultCard, FixOBDResultCard } from "./FixDiagnosticResultCard";

type Phase = "idle" | "active" | "awaiting_followup";
const DTC_RE = /^[PBCUpbcu]\d{4}$/;

const SYMPTOM_LABELS: Record<string, string> = {
  no_crank: "No Crank", crank_no_start: "Crank No Start", loss_of_power: "Loss of Power",
  rough_idle: "Rough Idle", strange_noise: "Strange Noise", visible_leak: "Visible Leak",
  overheating: "Overheating", check_engine_light: "Check Engine Light",
  brakes: "Brakes", transmission: "Transmission", suspension: "Suspension", hvac: "HVAC",
};

interface FixChatProps {
  initialContextHint?:    string;
  initialAssetType?:      string;
  initialAssetMakeModel?: string;
}

function renderInline(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, li) => (
    <Fragment key={li}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, pi) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={pi}>{part.slice(2, -2)}</strong>;
        }
        return <Fragment key={pi}>{part}</Fragment>;
      })}
      {li < lines.length - 1 && <br />}
    </Fragment>
  ));
}

export function FixChat({
  initialContextHint,
  initialAssetType,
  initialAssetMakeModel,
}: FixChatProps) {
  const [phase, setPhase]               = useState<Phase>("idle");
  const [messages, setMessages]         = useState<ChatMessage[]>([]);
  const [input, setInput]               = useState(initialContextHint ? `${initialContextHint}\n\n` : "");
  const [sessionId, setSessionId]       = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [history, setHistory]           = useState<SessionSummary[]>([]);
  const [pendingFile, setPendingFile]   = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sessionMode, setSessionMode]   = useState<SessionMode>("mechanic");
  const [showHeavyForm, setShowHeavyForm] = useState(
    initialAssetType?.toLowerCase().includes("excavator") ||
    initialAssetType?.toLowerCase().includes("loader") ||
    initialAssetType?.toLowerCase().includes("dozer") ||
    false,
  );
  const [heavyContext, setHeavyContext] = useState<HeavyEquipmentContext>({});
  const [resolvedIds, setResolvedIds]   = useState<Set<string>>(new Set());
  const [showHistorySheet, setShowHistorySheet] = useState(false);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (!loading) inputRef.current?.focus(); }, [loading, phase]);
  useEffect(() => { listSessions().then(setHistory).catch(() => { /* no sessions yet */ }); }, []);

  const refreshHistory = () => listSessions().then(setHistory).catch(() => { /* ignore */ });
  const pushMessage = (m: ChatMessage) => setMessages((prev) => [...prev, m]);

  function clearImage() {
    setPendingFile(null);
    setImagePreview(null);
  }

  function handleNew() {
    setPhase("idle");
    setMessages([]);
    setSessionId(null);
    setInput(initialContextHint ? `${initialContextHint}\n\n` : "");
    setError(null);
    clearImage();
  }

  async function handleResume(id: string) {
    setLoading(true);
    setError(null);
    setShowHistorySheet(false);
    try {
      const state = await getSession(id);
      setMessages(state.messages.map((m) => ({
        role:     m.role as "user" | "assistant",
        content:  m.content,
        msg_type: m.type as ChatMessage["msg_type"],
        result:   m.type === "result" && state.result ? state.result : undefined,
      })));
      setSessionId(id);
      setPhase(state.status === "active" ? "active" : "awaiting_followup");
    } catch {
      setError("Couldn't load that session.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSession(id);
      setHistory((prev) => prev.filter((s) => s.session_id !== id));
      if (sessionId === id) handleNew();
    } catch {
      setError("Could not delete session.");
    }
  }

  async function handleMarkResolved() {
    if (!sessionId) return;
    try {
      await completeSession(sessionId);
      setResolvedIds((p) => new Set([...p, sessionId]));
      refreshHistory();
    } catch {
      setError("Could not mark resolved.");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview("__file__");
    }
    e.target.value = "";
  }

  async function handleSend() {
    const text = input.trim();
    if (!text && !pendingFile) return;
    if (loading) return;
    setInput("");
    setError(null);
    setLoading(true);

    try {
      if (pendingFile) {
        const file = pendingFile;
        const preview = imagePreview;
        clearImage();

        if (!sessionId) {
          const desc = text || "I'm uploading a photo of an equipment issue.";
          pushMessage({ role: "user", content: text || desc });
          const res = await createSession(desc, undefined, {
            session_mode: sessionMode,
            heavy_context: showHeavyForm ? heavyContext : undefined,
          });
          if (!res.session_id) throw new Error("No session id from backend");
          setSessionId(res.session_id);
          pushMessage({ role: "assistant", content: res.message, msg_type: res.msg_type, result: res.result ?? undefined });
          setPhase(res.msg_type === "result" ? "awaiting_followup" : "active");
          refreshHistory();
          const upload = await uploadImage(res.session_id, file);
          pushMessage({ role: "assistant", content: upload.message, msg_type: "chat" });
          refreshHistory();
          return;
        }

        if (text) pushMessage({ role: "user", content: text });
        pushMessage({ role: "user", content: preview ?? "[Photo]", msg_type: "image" });
        const upload = await uploadImage(sessionId, file);
        pushMessage({ role: "assistant", content: upload.message, msg_type: "chat" });
        if (text) {
          const res = await sendMessage(sessionId, text);
          pushMessage({ role: "assistant", content: res.message, msg_type: res.msg_type, result: res.result ?? undefined });
          if (res.msg_type === "result") setPhase("awaiting_followup");
        }
        refreshHistory();
        return;
      }

      pushMessage({ role: "user", content: text });

      if (phase === "idle" && DTC_RE.test(text)) {
        try {
          const result = await lookupOBDCode(text.toUpperCase());
          pushMessage({ role: "assistant", content: "", msg_type: "result", obd_result: result });
        } catch {
          setError("OBD code lookup failed.");
        }
        return;
      }

      if (phase === "idle") {
        const res = await createSession(text, undefined, {
          session_mode: sessionMode,
          heavy_context: showHeavyForm ? heavyContext : undefined,
        });
        if (res.session_id) setSessionId(res.session_id);
        pushMessage({ role: "assistant", content: res.message, msg_type: res.msg_type, result: res.result ?? undefined });
        setPhase(res.msg_type === "result" ? "awaiting_followup" : "active");
        refreshHistory();
        return;
      }

      if (!sessionId) return;
      const res = await sendMessage(sessionId, text);
      if (res.msg_type === "result" && res.result) {
        const isFollowup = phase === "awaiting_followup";
        if (isFollowup) pushMessage({ role: "assistant", content: res.message, msg_type: "chat" });
        pushMessage({ role: "assistant", content: "", msg_type: "result", result: res.result });
        setPhase("awaiting_followup");
      } else {
        pushMessage({ role: "assistant", content: res.message, msg_type: res.msg_type });
        if (res.msg_type === "result") setPhase("awaiting_followup");
      }
      refreshHistory();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const showHistory = phase === "idle" && history.length > 0;
  const isResolved = sessionId ? resolvedIds.has(sessionId) : false;
  const inputPlaceholder =
    phase === "idle"
      ? `Describe the problem (e.g. "${initialAssetMakeModel ?? "Cat 336"} won't start, loud crank")…`
      : phase === "awaiting_followup"
        ? "Report what you found from those checks…"
        : "Type your answer…";

  return (
    <div className="flex flex-1 min-h-0">
      {showHistory && (
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-surface-border bg-surface-base">
          <div className="px-4 py-3 border-b border-surface-border">
            <p className="text-xs font-bold uppercase tracking-widest text-content-muted">Recent Sessions</p>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {history.map((s) => (
              <SessionRow key={s.session_id} session={s} onResume={handleResume} onDelete={handleDelete} />
            ))}
          </div>
        </aside>
      )}

      <section className="flex flex-col flex-1 min-h-0 max-w-3xl mx-auto w-full">
        <div className="shrink-0 px-5 py-3 border-b border-surface-border flex items-center justify-between bg-surface-base">
          <div>
            <h2 className="text-sm font-bold text-content-primary">Fix - Diagnostic AI</h2>
            <p className="text-xs text-content-muted">Engine, drivetrain, hydraulics</p>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={() => setShowHistorySheet(true)}
                className="md:hidden inline-flex items-center gap-1.5 text-xs text-content-secondary hover:text-content-primary border border-surface-border rounded-lg px-3 py-1.5"
              >
                <History size={12} /> History
              </button>
            )}
            {phase !== "idle" && (
              <button
                onClick={handleNew}
                className="inline-flex items-center gap-1.5 text-xs text-content-secondary hover:text-content-primary border border-surface-border rounded-lg px-3 py-1.5"
              >
                <Plus size={12} /> New session
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <AssistantBubble>
                Describe the problem and I&apos;ll help narrow down the cause. Include the make, model, and what you noticed.
              </AssistantBubble>
              <div className="ml-9 flex items-center gap-1.5 text-xs">
                <span className="text-content-muted mr-1">Mode:</span>
                {(["consumer", "operator", "mechanic"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSessionMode(m)}
                    className={`px-2.5 py-1 rounded-[var(--radius-pill)] border capitalize transition-colors ${
                      sessionMode === m
                        ? "bg-teal text-content-inverse border-teal"
                        : "border-surface-border text-content-secondary hover:border-teal/40 hover:text-teal"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="ml-9">
                <button
                  onClick={() => setShowHeavyForm((v) => !v)}
                  className="text-xs text-gold border border-gold/30 bg-gold/10 hover:bg-gold/20 rounded-[var(--radius-pill)] px-3 py-1.5"
                >
                  {showHeavyForm ? "Hide heavy-equipment context" : "Heavy equipment? Add context"}
                </button>
              </div>
              {showHeavyForm && (
                <div className="ml-9">
                  <FixHeavyContextForm value={heavyContext} onChange={setHeavyContext} />
                </div>
              )}
            </div>
          )}

          {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}

          {phase === "awaiting_followup" && !loading && sessionId && (
            <AssistantBubble accent>
              Run those checks and come back - tell me what you find and I&apos;ll refine the diagnosis.
              {!isResolved ? (
                <div className="mt-2">
                  <button
                    onClick={handleMarkResolved}
                    className="text-xs font-semibold text-status-success border border-status-success/30 bg-status-success/10 hover:bg-status-success/20 rounded-lg px-3 py-1.5"
                  >
                    Mark as resolved
                  </button>
                </div>
              ) : (
                <p className="text-xs text-status-success mt-2 font-semibold">Marked as resolved</p>
              )}
            </AssistantBubble>
          )}

          {loading && (
            <AssistantBubble>
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </AssistantBubble>
          )}

          {error && (
            <div className="text-center">
              <span className="inline-block text-xs text-status-critical border border-status-critical/30 bg-status-critical/10 rounded-lg px-3 py-1.5">
                {error}
              </span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-surface-border bg-surface-base">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          {imagePreview && (
            <div className="mb-2 flex items-center gap-2">
              <div className="relative inline-block">
                {imagePreview === "__file__" ? (
                  <div className="h-16 w-16 rounded-lg border border-surface-border bg-surface-overlay flex items-center justify-center text-content-muted text-xs">
                    File
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-surface-border" />
                )}
                <button
                  onClick={clearImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-content-primary text-content-inverse flex items-center justify-center"
                  aria-label="Remove file"
                >
                  <X size={10} />
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="shrink-0 w-10 h-10 rounded-lg border border-surface-border text-content-muted hover:text-teal hover:border-teal disabled:opacity-40 transition-colors flex items-center justify-center"
              aria-label="Attach photo"
            >
              <ImageIcon size={16} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder={imagePreview ? "Add a caption (optional)…" : inputPlaceholder}
              rows={2}
              className="flex-1 resize-none rounded-lg border border-surface-border bg-surface-overlay px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-teal disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={loading || (!input.trim() && !pendingFile)}
              className="shrink-0 w-10 h-10 rounded-lg bg-teal text-content-inverse hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-content-muted mt-1.5 ml-1">
            {phase === "awaiting_followup"
              ? "Take your time - come back when you've checked"
              : "Press Enter to send · Shift+Enter for newline"}
          </p>
        </div>
      </section>

      {showHistorySheet && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistorySheet(false)} />
          <div className="relative bg-surface-base border-t border-surface-border rounded-t-2xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
              <p className="text-sm font-semibold text-content-primary">Recent Sessions</p>
              <button onClick={() => setShowHistorySheet(false)} className="text-content-muted hover:text-content-primary" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto py-2 px-2 space-y-0.5">
              {history.map((s) => (
                <SessionRow key={s.session_id} session={s} onResume={handleResume} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssistantBubble({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex justify-start">
      <div className="flex items-end gap-2 max-w-[85%]">
        <div className="w-7 h-7 rounded-full bg-teal text-content-inverse flex items-center justify-center text-xs font-bold mb-1 shrink-0">AI</div>
        <div className={`rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed ${
          accent
            ? "bg-teal/10 border border-teal/30 text-content-primary"
            : "bg-surface-raised border border-surface-border text-content-primary shadow-[var(--shadow-card)]"
        }`}>
          {children}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="flex items-end gap-2 flex-row-reverse max-w-[85%]">
        <div className="w-7 h-7 rounded-full bg-content-primary text-content-inverse flex items-center justify-center text-xs font-bold mb-1 shrink-0">U</div>
        <div className="rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed bg-teal text-content-inverse">
          {children}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.obd_result) {
    return (
      <div className="flex justify-start">
        <div className="ml-9 max-w-[85%]"><FixOBDResultCard result={msg.obd_result} /></div>
      </div>
    );
  }
  if (msg.result) {
    return (
      <div className="flex justify-start">
        <div className="ml-9 max-w-[85%]"><FixDiagnosticResultCard result={msg.result} /></div>
      </div>
    );
  }
  if (msg.msg_type === "image") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={msg.content} alt="Uploaded" className="h-40 max-w-xs object-cover rounded-2xl rounded-br-sm border border-surface-border" />
        </div>
      </div>
    );
  }
  return msg.role === "user"
    ? <UserBubble>{renderInline(msg.content)}</UserBubble>
    : <AssistantBubble>{renderInline(msg.content)}</AssistantBubble>;
}

function SessionRow({
  session, onResume, onDelete,
}: {
  session: SessionSummary;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const vehicle = [session.vehicle_year, session.vehicle_make, session.vehicle_model].filter(Boolean).join(" ");
  const symptom = session.symptom_category
    ? (SYMPTOM_LABELS[session.symptom_category] ?? session.symptom_category)
    : "Unknown";
  const date = new Date(session.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const isOpen = session.status === "active" || session.status === "awaiting_followup";

  return (
    <div className="relative group">
      <button
        onClick={() => !confirm && onResume(session.session_id)}
        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface-overlay transition-colors pr-8"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-semibold text-content-primary truncate">{vehicle || "Unknown vehicle"}</span>
          <span className="text-xs text-content-muted shrink-0">{date}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-xs text-content-secondary">{symptom}</span>
          {isOpen && <span className="text-xs text-teal font-semibold">· Open</span>}
          {session.status === "complete" && <span className="text-xs text-status-success font-semibold">· Resolved</span>}
        </div>
        {session.top_cause && (
          <p className="text-xs text-content-secondary truncate mt-0.5 font-medium">{session.top_cause}</p>
        )}
        <p className="text-xs text-content-muted truncate mt-0.5">{session.excerpt}</p>
      </button>
      <div className="absolute top-2 right-2">
        {!confirm ? (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirm(true); }}
            className="opacity-0 group-hover:opacity-100 transition text-content-muted hover:text-status-critical p-0.5"
            aria-label="Delete session"
          >
            <Trash2 size={12} />
          </button>
        ) : (
          <div className="flex items-center gap-1 text-xs bg-surface-raised border border-surface-border rounded px-1.5 py-0.5">
            <button onClick={(e) => { e.stopPropagation(); onDelete(session.session_id); }} className="text-status-critical font-semibold">Del</button>
            <span className="text-surface-border">|</span>
            <button onClick={(e) => { e.stopPropagation(); setConfirm(false); }} className="text-content-muted">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
