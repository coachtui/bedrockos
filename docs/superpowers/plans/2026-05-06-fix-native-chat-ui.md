# Fix Native Diagnostic Chat UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the iframe at `/modules/fix` with a native BedrockOS diagnostic chat UI that calls Fix's API through the existing partner-key proxy at `/api/fix/[...path]`.

**Architecture:** Server component (`page.tsx`) keeps loading issue/asset/project for the context banner. Below the banner, a new `<FixChat>` client component owns the entire chat experience: session list sidebar, heavy-equipment context form, message input + image upload, polling responses, and diagnostic result rendering. All API traffic goes through `/api/fix/*`. The proxy is updated to support multipart bodies for image uploads.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS with BedrockOS design tokens (`--color-teal`, `surface-raised`, `--shadow-card`, etc.), Lucide icons.

---

## File Structure

**Modify:**
- `src/app/(shell)/modules/fix/page.tsx` — strip iframe block, mount `<FixChat>` below banner, pass asset/issue/project context as props
- `src/app/api/fix/[...path]/route.ts` — handle non-JSON bodies (multipart for image uploads); preserve content-type instead of forcing JSON

**Create:**
- `src/lib/fix/types.ts` — TypeScript types mirrored from Fix's `/Users/tui/fix/frontend/src/types/index.ts` (only what we need for the chat surface)
- `src/lib/fix/api.ts` — typed fetch helpers calling `/api/fix/*`
- `src/components/modules/fix/FixChat.tsx` — main client component (state, sessions, messages, input)
- `src/components/modules/fix/FixDiagnosticResultCard.tsx` — diagnostic result rendering with BedrockOS tokens
- `src/components/modules/fix/FixHeavyContextForm.tsx` — heavy-equipment context form, BedrockOS-styled

---

## Task 1: Types module

**Files:**
- Create: `src/lib/fix/types.ts`

- [ ] **Step 1: Write the types file**

```ts
// src/lib/fix/types.ts
// Mirrored from /Users/tui/fix/frontend/src/types/index.ts.
// Only the subset we need for the diagnostic chat surface.

export type VehicleType =
  | "car" | "truck" | "motorcycle" | "boat" | "generator"
  | "atv" | "pwc" | "rv" | "heavy_equipment" | "other";

export type SessionMode = "consumer" | "operator" | "mechanic";

export interface HeavyEquipmentContext {
  hours_of_operation?: number;
  last_service_hours?: number;
  environment?: "dusty" | "muddy" | "marine" | "urban";
  storage_duration?: number;
  recent_work_type?: string;
}

export interface Vehicle {
  year?: number;
  make?: string;
  model?: string;
  engine?: string;
  vehicle_type?: VehicleType;
}

export interface RankedCause {
  cause: string;
  confidence: number;
  reasoning: string;
}

export interface SuggestedPart {
  name: string;
  notes: string;
}

export interface DiagnosticResult {
  ranked_causes: RankedCause[];
  next_checks: string[];
  diy_difficulty: "easy" | "moderate" | "hard" | "seek_mechanic" | null;
  suggested_parts: SuggestedPart[];
  escalation_guidance: string | null;
  confidence_level: number;
  post_diagnosis: string[];
}

export interface OBDResult {
  code: string;
  description: string;
  severity: "low" | "moderate" | "high" | "critical";
  likely_causes: string[];
  next_steps: string[];
  diy_difficulty: "easy" | "moderate" | "hard" | "seek_mechanic";
}

export interface MessageResponse {
  session_id: string;
  message: string;
  msg_type: "question" | "result" | "error";
  turn: number;
  result: DiagnosticResult | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  msg_type?: "question" | "result" | "chat" | "image" | "error";
  result?: DiagnosticResult;
  obd_result?: OBDResult;
}

export interface SessionSummary {
  session_id: string;
  created_at: string;
  status: "active" | "awaiting_followup" | "complete" | "abandoned";
  symptom_category: string | null;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_type: VehicleType;
  excerpt: string;
  top_cause: string | null;
}

export interface SessionState {
  session_id: string;
  status: string;
  turn_count: number;
  symptom_category: string | null;
  vehicle: Vehicle;
  messages: { role: string; content: string; type: string }[];
  result: DiagnosticResult | null;
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors)

---

## Task 2: API client

**Files:**
- Create: `src/lib/fix/api.ts`

- [ ] **Step 1: Write the API client**

The client calls relative URLs `/api/fix/*` so requests flow through the BedrockOS proxy (which adds partner-key auth + user identity headers). No `credentials: include` needed — same-origin Next.js cookie session is implicit.

```ts
// src/lib/fix/api.ts
import type {
  HeavyEquipmentContext, MessageResponse, OBDResult,
  SessionMode, SessionState, SessionSummary, Vehicle,
} from "./types";

const BASE = "/api/fix";

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Fix API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function createSession(
  description: string,
  vehicle?: Vehicle,
  options?: { session_mode?: SessionMode; heavy_context?: HeavyEquipmentContext },
): Promise<MessageResponse> {
  return fetchJSON<MessageResponse>("/sessions", {
    method: "POST",
    body: JSON.stringify({
      description,
      vehicle,
      session_mode: options?.session_mode ?? "mechanic",
      heavy_context: options?.heavy_context,
    }),
  });
}

export function sendMessage(sessionId: string, content: string): Promise<MessageResponse> {
  return fetchJSON<MessageResponse>(`/sessions/${sessionId}/message`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function getSession(sessionId: string): Promise<SessionState> {
  return fetchJSON<SessionState>(`/sessions/${sessionId}`);
}

export function listSessions(): Promise<SessionSummary[]> {
  return fetchJSON<SessionSummary[]>("/sessions");
}

export function completeSession(sessionId: string): Promise<{ session_id: string; status: string }> {
  return fetchJSON(`/sessions/${sessionId}/complete`, { method: "PATCH" });
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${BASE}/sessions/${sessionId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Fix API ${res.status}`);
}

export function lookupOBDCode(code: string, vehicle?: Vehicle): Promise<OBDResult> {
  return fetchJSON<OBDResult>("/obd/lookup", {
    method: "POST",
    body: JSON.stringify({ code, vehicle }),
  });
}

export async function uploadImage(
  sessionId: string,
  file: File,
  confidenceModifier: number = 0.8,
): Promise<MessageResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("confidence_modifier", String(confidenceModifier));
  const res = await fetch(`${BASE}/sessions/${sessionId}/image`, {
    method: "POST",
    body: formData,
    // No Content-Type — browser sets multipart boundary
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Fix API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<MessageResponse>;
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: PASS

---

## Task 3: Update proxy to handle multipart bodies

**Files:**
- Modify: `src/app/api/fix/[...path]/route.ts`

The current proxy reads the body as text and forces `Content-Type: application/json`. Image uploads use `multipart/form-data`, so we need to:
1. Forward the original body via `request.body` (ReadableStream) for non-GET/DELETE
2. Forward the original `Content-Type` header instead of hardcoding JSON
3. Use `duplex: "half"` (Next.js requirement for streaming bodies)

- [ ] **Step 1: Replace the body/header handling**

Replace the headers and body assembly inside `proxy()`:

```ts
  const url    = new URL(request.url);
  const target = `${FIX_BACKEND_URL}/api/${params.path.join("/")}${url.search}`;

  const headers = new Headers();
  // Preserve the client's Content-Type (JSON, multipart/form-data, etc.)
  const incomingContentType = request.headers.get("content-type");
  if (incomingContentType) headers.set("Content-Type", incomingContentType);
  // Partner-auth handshake — Fix backend trusts these because of FIX_PARTNER_KEY
  headers.set("X-Partner-Key",        FIX_PARTNER_KEY);
  headers.set("X-Partner-User-Id",    sessionUser.id);
  headers.set("X-Partner-User-Email", email);
  headers.set("X-Partner-Org-Id",     orgId);

  const hasBody = method !== "GET" && method !== "DELETE";

  try {
    const res = await fetch(target, {
      method,
      headers,
      body: hasBody ? request.body : undefined,
      // Required by undici when streaming a request body
      ...(hasBody ? { duplex: "half" } : {}),
    } as RequestInit & { duplex?: "half" });
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Fix service unreachable" }, { status: 502 });
  }
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: PASS

---

## Task 4: Heavy equipment context form (BedrockOS-styled)

**Files:**
- Create: `src/components/modules/fix/FixHeavyContextForm.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import type { HeavyEquipmentContext } from "@/lib/fix/types";

const ENVIRONMENTS = [
  { value: "dusty",  label: "Dusty — quarry, demolition, earthmoving" },
  { value: "muddy",  label: "Muddy — wet earthmoving, construction" },
  { value: "marine", label: "Marine — near water, saltwater air" },
  { value: "urban",  label: "Normal / urban" },
] as const;

interface Props {
  value:    HeavyEquipmentContext;
  onChange: (ctx: HeavyEquipmentContext) => void;
}

export function FixHeavyContextForm({ value, onChange }: Props) {
  const set = <K extends keyof HeavyEquipmentContext>(k: K, v: HeavyEquipmentContext[K]) =>
    onChange({ ...value, [k]: v });

  const inputCls =
    "w-full rounded-lg border border-surface-border bg-surface-overlay px-3 py-2 text-sm " +
    "text-content-primary placeholder:text-content-muted focus:outline-none focus:border-teal";

  return (
    <div className="rounded-[var(--radius-card)] border border-gold/30 bg-gold/5 p-4 space-y-4 text-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-gold">
        Heavy Equipment Context <span className="text-content-muted normal-case font-normal">— optional, improves accuracy</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-content-muted mb-1.5">Machine hours</label>
          <input
            type="number" inputMode="numeric" min={0}
            placeholder="e.g. 4500"
            value={value.hours_of_operation ?? ""}
            onChange={(e) => set("hours_of_operation", e.target.value ? Number(e.target.value) : undefined)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs text-content-muted mb-1.5">Hours since last service</label>
          <input
            type="number" inputMode="numeric" min={0}
            placeholder="e.g. 210"
            value={value.last_service_hours ?? ""}
            onChange={(e) => set("last_service_hours", e.target.value ? Number(e.target.value) : undefined)}
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-content-muted mb-1.5">Working environment</label>
        <select
          value={value.environment ?? ""}
          onChange={(e) => set("environment", (e.target.value || undefined) as HeavyEquipmentContext["environment"])}
          className={inputCls}
        >
          <option value="">Not sure</option>
          {ENVIRONMENTS.map((env) => (
            <option key={env.value} value={env.value}>{env.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-content-muted mb-1.5">Days since last used</label>
          <input
            type="number" inputMode="numeric" min={0}
            placeholder="e.g. 45"
            value={value.storage_duration ?? ""}
            onChange={(e) => set("storage_duration", e.target.value ? Number(e.target.value) : undefined)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs text-content-muted mb-1.5">Recent work type</label>
          <input
            type="text"
            placeholder="e.g. trenching"
            value={value.recent_work_type ?? ""}
            onChange={(e) => set("recent_work_type", e.target.value || undefined)}
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: PASS

---

## Task 5: Diagnostic result card (BedrockOS-styled)

**Files:**
- Create: `src/components/modules/fix/FixDiagnosticResultCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { Copy } from "lucide-react";
import type { DiagnosticResult, OBDResult } from "@/lib/fix/types";

const SEVERITY: Record<OBDResult["severity"], { label: string; cls: string }> = {
  low:      { label: "Low - monitor",                cls: "text-status-success border-status-success/30 bg-status-success/10" },
  moderate: { label: "Moderate - address soon",      cls: "text-status-warning border-status-warning/30 bg-status-warning/10" },
  high:     { label: "High - address promptly",      cls: "text-status-warning border-status-warning/40 bg-status-warning/15" },
  critical: { label: "Critical - stop operating",    cls: "text-status-critical border-status-critical/40 bg-status-critical/10" },
};

const DIY: Record<NonNullable<DiagnosticResult["diy_difficulty"]>, { label: string; cls: string }> = {
  easy:          { label: "Easy DIY",       cls: "text-status-success border-status-success/30 bg-status-success/10" },
  moderate:      { label: "Moderate DIY",   cls: "text-gold border-gold/30 bg-gold/10" },
  hard:          { label: "Difficult DIY",  cls: "text-status-warning border-status-warning/30 bg-status-warning/10" },
  seek_mechanic: { label: "See a Mechanic", cls: "text-status-critical border-status-critical/30 bg-status-critical/10" },
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-status-success" : pct >= 45 ? "bg-gold" : "bg-status-critical";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 bg-surface-overlay rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-content-muted w-9 text-right tabular-nums">{pct}%</span>
    </div>
  );
}

export function FixDiagnosticResultCard({ result }: { result: DiagnosticResult }) {
  const diy = result.diy_difficulty ? DIY[result.diy_difficulty] : null;
  const overall = Math.round(result.confidence_level * 100);

  function handleCopy() {
    const top = result.ranked_causes[0];
    const lines: string[] = [
      "=== Fix Diagnostic Summary ===",
      "",
      `Top Cause: ${top?.cause ?? "Unknown"} (${Math.round((top?.confidence ?? 0) * 100)}%)`,
      ...(top?.reasoning ? [`Reasoning: ${top.reasoning}`] : []),
      "",
      "Likely Causes:",
      ...result.ranked_causes.map((c, i) => `  ${i + 1}. ${c.cause} - ${Math.round(c.confidence * 100)}%`),
    ];
    if (result.next_checks.length > 0) {
      lines.push("", "Next Checks:");
      result.next_checks.forEach((c) => lines.push(`  - ${c}`));
    }
    if (result.escalation_guidance) {
      lines.push("", `When to escalate: ${result.escalation_guidance}`);
    }
    void navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="mt-3 rounded-[var(--radius-card)] border border-surface-border bg-surface-raised shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-4 py-3 bg-surface-overlay border-b border-surface-border flex items-center justify-between">
        <span className="text-sm font-semibold text-content-primary">Diagnostic Result</span>
        <span className="text-xs text-content-muted tabular-nums">{overall}% confidence</span>
      </div>

      <div className="divide-y divide-surface-border">
        <div className="px-4 py-4">
          <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-3">Likely Causes</h3>
          <div className="space-y-3.5">
            {result.ranked_causes.map((c, i) => (
              <div key={i}>
                <div className="text-sm font-medium text-content-primary">
                  {i + 1}. {c.cause}
                </div>
                <ConfidenceBar value={c.confidence} />
                <p className="text-xs text-content-secondary mt-1.5 leading-relaxed">{c.reasoning}</p>
              </div>
            ))}
          </div>
        </div>

        {result.next_checks.length > 0 && (
          <div className="px-4 py-4">
            <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-2.5">Next Checks</h3>
            <ol className="space-y-1.5">
              {result.next_checks.map((check, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-content-secondary">
                  <span className="text-content-muted font-mono text-xs mt-0.5 min-w-4 tabular-nums">{i + 1}.</span>
                  {check}
                </li>
              ))}
            </ol>
          </div>
        )}

        {result.post_diagnosis.length > 0 && (
          <div className="px-4 py-4 bg-teal/5">
            <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-2.5">After Confirming, Also Check</h3>
            <ul className="space-y-1.5">
              {result.post_diagnosis.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-content-secondary">
                  <span className="text-teal mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="px-4 py-4 flex flex-wrap gap-4">
          {diy && (
            <div>
              <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-1.5">DIY Level</h3>
              <span className={`inline-block px-2.5 py-1 rounded-[var(--radius-pill)] text-xs font-semibold border ${diy.cls}`}>
                {diy.label}
              </span>
            </div>
          )}
          {result.suggested_parts.length > 0 && (
            <div className="flex-1 min-w-[180px]">
              <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-1.5">Possible Parts</h3>
              <ul className="space-y-0.5">
                {result.suggested_parts.map((p, i) => (
                  <li key={i} className="text-sm text-content-secondary">
                    <span className="font-medium text-content-primary">{p.name}</span>
                    {p.notes && <span className="text-content-muted"> - {p.notes}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {result.escalation_guidance && (
          <div className="px-4 py-4 bg-status-warning/10">
            <h3 className="text-xs font-bold text-status-warning uppercase tracking-widest mb-1.5">When to See a Mechanic</h3>
            <p className="text-sm text-content-primary leading-relaxed">{result.escalation_guidance}</p>
          </div>
        )}

        <div className="px-4 py-3 flex items-center justify-end">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors"
          >
            <Copy size={12} /> Copy summary
          </button>
        </div>
      </div>
    </div>
  );
}

export function FixOBDResultCard({ result }: { result: OBDResult }) {
  const sev = SEVERITY[result.severity];
  const diy = DIY[result.diy_difficulty];
  return (
    <div className="mt-3 rounded-[var(--radius-card)] border border-surface-border bg-surface-raised shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-4 py-3 bg-surface-overlay border-b border-surface-border flex items-center justify-between">
        <span className="text-sm font-semibold text-content-primary font-mono">{result.code}</span>
        <span className={`text-xs px-2.5 py-1 rounded-[var(--radius-pill)] font-semibold border ${sev.cls}`}>
          {sev.label}
        </span>
      </div>
      <div className="divide-y divide-surface-border">
        <div className="px-4 py-4">
          <p className="text-sm text-content-primary leading-relaxed">{result.description}</p>
        </div>
        {result.likely_causes.length > 0 && (
          <div className="px-4 py-4">
            <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-2.5">Likely Causes</h3>
            <ul className="space-y-1.5">
              {result.likely_causes.map((c, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-content-secondary">
                  <span className="text-content-muted font-mono text-xs mt-0.5 min-w-4 tabular-nums">{i + 1}.</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.next_steps.length > 0 && (
          <div className="px-4 py-4">
            <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-2.5">Next Steps</h3>
            <ol className="space-y-1.5">
              {result.next_steps.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-content-secondary">
                  <span className="text-content-muted font-mono text-xs mt-0.5 min-w-4 tabular-nums">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}
        {diy && (
          <div className="px-4 py-4">
            <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-1.5">DIY Level</h3>
            <span className={`inline-block px-2.5 py-1 rounded-[var(--radius-pill)] text-xs font-semibold border ${diy.cls}`}>
              {diy.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: PASS

---

## Task 6: Main FixChat client component

**Files:**
- Create: `src/components/modules/fix/FixChat.tsx`

The main component owns:
- Session list (sidebar, only shown in `idle` phase)
- Heavy-equipment context form (toggle)
- Pre-fill from props (asset/issue/project) on first render — populates an opening user message draft
- Mode selector (consumer / operator / mechanic)
- Message list, input, image upload
- Diagnostic result card rendering
- Mark-as-resolved button after diagnosis

DTC pattern auto-detect: a single fault-code message bypasses session creation and calls `lookupOBDCode` directly.

Markdown rendering note: assistant messages may contain `**bold**` and newlines from the Fix backend. We render them safely with React fragments (no `dangerouslySetInnerHTML`) — the `renderInline` helper splits on bold markers and newlines and emits `<strong>` / `<br />` elements directly.

- [ ] **Step 1: Write the component**

```tsx
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

// Render assistant text with **bold** + newlines, no innerHTML.
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

  function clearImage() {
    setPendingFile(null);
    setImagePreview(null);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text && !pendingFile) return;
    if (loading) return;
    setInput("");
    setError(null);
    setLoading(true);

    try {
      // Image-first send
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

      // Text-only send
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
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: PASS

---

## Task 7: Wire FixChat into the page (replace iframe)

**Files:**
- Modify: `src/app/(shell)/modules/fix/page.tsx`

The page stays a server component to keep the existing context-banner data fetching. Below the banner we mount `<FixChat>` (client) with pre-fill props derived from the loaded asset.

- [ ] **Step 1: Update the page**

Replace the iframe block at the bottom with `<FixChat>` and remove the `FIX_APP_URL` import (no longer needed for embedding).

```tsx
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Wrench, AlertTriangle, X, ArrowLeft, Truck, Building2,
} from "lucide-react";
import { fetchOrgAlertById } from "@/lib/supabase/alerts";
import { fetchOrgIssueById } from "@/lib/supabase/issues";
import { fetchOrgAssetById } from "@/lib/supabase/assets";
import { fetchOrgProjects } from "@/lib/supabase/projects";
import { getSourceConfig } from "@/lib/modules/source-config";
import { FixEscalateButton } from "@/components/modules/fix/FixEscalateButton";
import { FixChat } from "@/components/modules/fix/FixChat";

export const metadata = { title: "Fix" };
const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

type SearchParams = Promise<{
  issueId?: string;
  assetId?: string;
  alertId?: string;
  source?:  string;
  role?:    string;
}>;

export default async function FixPage({ searchParams }: { searchParams: SearchParams }) {
  const params  = await searchParams;
  const issueId = typeof params.issueId === "string" ? params.issueId : null;
  const assetId = typeof params.assetId === "string" ? params.assetId : null;
  const alertId = typeof params.alertId === "string" ? params.alertId : null;
  const source  = typeof params.source  === "string" ? params.source  : null;
  const role    = typeof params.role    === "string" ? params.role    : null;

  const issue = issueId ? await fetchOrgIssueById(ORG_ID, issueId) : null;
  const asset = assetId ? await fetchOrgAssetById(ORG_ID, assetId) : null;
  const _alert = alertId ? await fetchOrgAlertById(ORG_ID, alertId) : null;
  void _alert;

  const projectId = issue?.project_id ?? asset?.project_id ?? null;
  const projects  = projectId ? await fetchOrgProjects(ORG_ID) : [];
  const project   = projectId ? projects.find((p) => p.id === projectId) ?? null : null;

  const hasContext   = !!(issue || asset);
  const sourceConfig = getSourceConfig(source);

  let returnHref:  string | null = null;
  let returnLabel: string | null = null;
  if (source === "issue-detail") {
    returnHref  = issue ? `/issues/${issue.id}` : "/issues";
    returnLabel = issue ? "Back to Issue" : "Back to Issues";
  } else if (source === "project-cc") {
    returnHref  = project ? `/projects/${project.id}` : "/projects";
    returnLabel = project ? `Back to ${project.name}` : "Back to Projects";
  } else if (source === "alert-detail") {
    returnHref  = "/alerts";
    returnLabel = "Back to Alert";
  }

  const contextChips = [
    issue   && { label: "Issue"   },
    asset   && { label: "Asset"   },
    project && { label: "Project" },
  ].filter(Boolean) as { label: string }[];

  // Hint passed to FixChat for the opening message draft
  const contextHint = [
    asset   && `Asset: ${asset.name} (${asset.type})`,
    issue   && `Issue: ${issue.title}`,
    project && `Project: ${project.name}`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {hasContext && (
        <div className="shrink-0 border-b border-teal/20 bg-teal/5">
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal/15 border border-teal/25 flex items-center justify-center shrink-0 mt-0.5">
                <Wrench size={14} className="text-teal" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-teal mb-0.5">
                  Diagnostic context
                </p>
                <p className="text-sm text-content-secondary">
                  {sourceConfig?.subtitle ?? "Opened with diagnostic context"}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {sourceConfig && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-teal border border-teal/25 bg-teal/10 rounded-[var(--radius-badge)] px-1.5 py-0.5">
                      {sourceConfig.label}
                    </span>
                  )}
                  {contextChips.map(({ label }) => (
                    <span key={label} className="text-[10px] font-semibold uppercase tracking-widest text-content-secondary border border-surface-border bg-surface-overlay rounded-[var(--radius-badge)] px-1.5 py-0.5">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Link href="/modules/fix" className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-content-muted hover:text-content-primary hover:bg-surface-overlay transition-colors" aria-label="Clear context">
              <X size={13} />
            </Link>
          </div>

          <div className="border-t border-teal/15 px-5 py-3 space-y-2">
            {issue && (
              <div className="flex items-center gap-3">
                <AlertTriangle size={12} className="text-content-muted shrink-0" />
                <span className="text-xs text-content-muted w-14 shrink-0">Issue</span>
                <span className="text-sm font-medium text-content-primary flex-1 min-w-0 truncate">{issue.title}</span>
                <StatusBadge status={issue.severity} />
              </div>
            )}
            {asset ? (
              <div className="flex items-center gap-3">
                <Truck size={12} className="text-content-muted shrink-0" />
                <span className="text-xs text-content-muted w-14 shrink-0">Asset</span>
                <span className="text-sm font-medium text-content-primary flex-1 min-w-0 truncate">
                  {asset.name}<span className="text-content-muted font-normal"> · {asset.type}</span>
                </span>
                <StatusBadge status={asset.status} />
              </div>
            ) : issue ? (
              <div className="flex items-center gap-3">
                <Truck size={12} className="text-content-muted shrink-0" />
                <span className="text-xs text-content-muted w-14 shrink-0">Asset</span>
                <span className="text-xs text-content-muted italic">No asset linked</span>
              </div>
            ) : null}
            {project && (
              <div className="flex items-center gap-3">
                <Building2 size={12} className="text-content-muted shrink-0" />
                <span className="text-xs text-content-muted w-14 shrink-0">Project</span>
                <span className="text-sm text-content-secondary flex-1 min-w-0 truncate">{project.name}</span>
              </div>
            )}
          </div>

          <div className="border-t border-teal/15 px-5 py-2.5 flex items-center gap-3">
            {returnHref && returnLabel && (
              <Link href={returnHref} className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:opacity-80 transition-opacity">
                <ArrowLeft size={11} />
                {returnLabel}
              </Link>
            )}
            {returnHref && <span className="text-surface-border">·</span>}
            <Link href="/modules/fix" className="text-xs text-content-muted hover:text-content-primary transition-colors">
              Clear context
            </Link>
            {asset && (role === "superintendent" || role === "foreman") && (
              <>
                <span className="text-surface-border">·</span>
                <FixEscalateButton assetId={asset.id} assetName={asset.name} projectId={asset.project_id} />
              </>
            )}
          </div>
        </div>
      )}

      <FixChat
        initialContextHint={contextHint || undefined}
        initialAssetType={asset?.type ?? undefined}
        initialAssetMakeModel={asset?.name ?? undefined}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: PASS

---

## Task 8: End-to-end verification

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS or only `next/img` warnings on the new files (already disabled inline).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Local smoke test (manual)**

Run: `npm run dev`

Test golden path:
1. Visit `/modules/fix` (no params) - empty chat, mode selector, history hidden until session exists.
2. Type "Cat 336 won't start, no clicking sound" + Enter - assistant replies, phase becomes `active`.
3. Type "P0420" as a fresh new session - DTC auto-detect renders `FixOBDResultCard` without creating a session.
4. Visit `/modules/fix?assetId=<id>&issueId=<id>&source=issue-detail` - context banner renders + opening input pre-filled with hint.
5. Click "Mark as resolved" after a diagnosis - session row in sidebar shows "Resolved".

If anything breaks, check Vercel logs for `/api/fix/*` to confirm partner-key headers are flowing.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/fix/[...path]/route.ts \
        src/app/\(shell\)/modules/fix/page.tsx \
        src/components/modules/fix/FixChat.tsx \
        src/components/modules/fix/FixDiagnosticResultCard.tsx \
        src/components/modules/fix/FixHeavyContextForm.tsx \
        src/lib/fix/api.ts \
        src/lib/fix/types.ts
git commit -m "feat(fix): native diagnostic chat UI replaces iframe"
```

- [ ] **Step 6: Ship**

Run `/ship` (gstack) to bump version, update CHANGELOG, and create the PR.

---

## Self-Review

- ✅ Spec coverage: iframe stripped (Task 7), native chat (Task 6), session sidebar (Task 6), heavy-equipment form (Task 4), pre-fill from URL params (Task 7 → Task 6 props), API through proxy (Tasks 2 + 3), tokens used throughout (Tasks 4–6).
- ✅ No placeholders - every step shows actual code.
- ✅ Type consistency - `MessageResponse`, `SessionSummary`, `HeavyEquipmentContext`, `DiagnosticResult` all use exact field names from the Fix backend (`session_id`, `msg_type`, `created_at`, `top_cause`, `confidence_level`, etc.).
- ✅ Proxy multipart fix is required - without Task 3, image upload via `FormData` is mangled by `request.text()`. Task 3 must land before image upload is exercised in QA.
- ✅ No `dangerouslySetInnerHTML` - assistant text is rendered with the `renderInline` helper that emits `<strong>` and `<br />` React elements directly.
