# Shell Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded mock in `AssistantPanel` with a real streaming Claude AI that knows the current org, project, role, and mock data.

**Architecture:** A new Next.js API route (`/api/assistant`) receives messages + context, builds a system prompt server-side with mock data injected, then streams a Claude response back using the Vercel AI SDK. The client panel adopts `useChat` from the AI SDK, replacing all manual message/input state.

**Tech Stack:** `ai` (Vercel AI SDK), `@ai-sdk/anthropic`, `useChat` hook, `streamText`, Next.js App Router

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/assistant/system-prompt.ts` | Create | Pure function: builds system prompt string from context + mock data |
| `src/app/api/assistant/route.ts` | Create | POST handler — parses body, builds prompt, streams Claude response |
| `src/components/layout/AssistantPanel.tsx` | Modify | Replace manual state with `useChat`, add streaming UX |
| `.env.local` | Modify | Add `ANTHROPIC_API_KEY` |
| `package.json` | Modify | Add `ai`, `@ai-sdk/anthropic` |

---

## Task 1: Install dependencies and add env var

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local`

- [ ] **Step 1: Install packages**

```bash
cd /Users/tui/aigacp
npm install ai @ai-sdk/anthropic
```

Expected output: packages added to `node_modules`, `package.json` updated with `"ai"` and `"@ai-sdk/anthropic"` in dependencies.

- [ ] **Step 2: Add API key to .env.local**

Open `.env.local` and append:

```
# ── AIGA Shell Assistant ──────────────────────────────────────────────────────
# Claude API key — server-side only (no NEXT_PUBLIC_ prefix)
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
```

Replace `sk-ant-YOUR_KEY_HERE` with your real key from console.anthropic.com.

- [ ] **Step 3: Verify TypeScript can resolve the new packages**

```bash
cd /Users/tui/aigacp
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors about missing `ai` or `@ai-sdk/anthropic` modules. (There may be pre-existing errors from other files — ignore those.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install ai sdk and @ai-sdk/anthropic"
```

---

## Task 2: Create the system prompt builder

**Files:**
- Create: `src/lib/assistant/system-prompt.ts`

This is a pure function — no side effects, no imports from React. It takes the context the client sends and returns the full system prompt string with mock data serialized inline.

- [ ] **Step 1: Create the file**

Create `src/lib/assistant/system-prompt.ts`:

```ts
import { MOCK_ISSUES }  from "@/lib/mock/issues";
import { MOCK_ALERTS }  from "@/lib/mock/alerts";
import { MOCK_CREWS }   from "@/lib/mock/crews";
import { MOCK_ASSETS }  from "@/lib/mock/assets";

interface PromptContext {
  org:            { name: string };
  project:        { name: string; status: string; location?: string };
  user:           { name: string; role: string };
  enabledModules: string[];
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const openIssues = MOCK_ISSUES
    .filter((i) => i.status !== "resolved")
    .map((i) => `${i.id}: [${i.severity}] ${i.title} (module: ${i.module}, assignee: ${i.assignee_name ?? "unassigned"})`)
    .join("\n");

  const activeAlerts = MOCK_ALERTS
    .filter((a) => !a.is_read)
    .map((a) => `${a.id}: [${a.severity}] ${a.message}`)
    .join("\n");

  const crews = MOCK_CREWS
    .map((c) => `${c.name} — lead: ${c.lead_name}, ${c.headcount} members, status: ${c.status}`)
    .join("\n");

  const assets = MOCK_ASSETS
    .map((a) => `${a.id}: ${a.name} (${a.type}, status: ${a.status})`)
    .join("\n");

  const location = ctx.project.location ? `, ${ctx.project.location}` : "";

  return `You are the AIGA Shell Assistant for ${ctx.org.name}.
You help users navigate the platform, surface project status, and coordinate across modules.
Be concise and direct. Use construction industry terminology naturally.
When referencing issues, alerts, or assets use their IDs so the user can look them up.

Current context:
- Project: ${ctx.project.name} (${ctx.project.status}${location})
- User: ${ctx.user.name}, role: ${ctx.user.role}
- Enabled modules: ${ctx.enabledModules.join(", ")}

Open issues:
${openIssues || "None"}

Active alerts:
${activeAlerts || "None"}

Crew roster:
${crews || "None"}

Assets:
${assets || "None"}`;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/tui/aigacp
npx tsc --noEmit 2>&1 | grep "system-prompt"
```

Expected: no output (no errors in the new file).

- [ ] **Step 3: Commit**

```bash
git add src/lib/assistant/system-prompt.ts
git commit -m "feat(assistant): add system prompt builder with mock data"
```

---

## Task 3: Create the streaming API route

**Files:**
- Create: `src/app/api/assistant/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/assistant/route.ts`:

```ts
import { streamText } from "ai";
import { anthropic }  from "@ai-sdk/anthropic";
import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/assistant/system-prompt";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 },
    );
  }

  const body = await request.json();
  const { messages, org, project, user, enabledModules } = body;

  if (!messages || !org || !project || !user) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt({ org, project, user, enabledModules: enabledModules ?? [] });

  const result = await streamText({
    model:    anthropic("claude-haiku-4-5-20251001"),
    system:   systemPrompt,
    messages,
    maxTokens: 1024,
  });

  return result.toDataStreamResponse();
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/tui/aigacp
npx tsc --noEmit 2>&1 | grep "assistant"
```

Expected: no output.

- [ ] **Step 3: Start dev server and smoke test the route**

```bash
npm run dev
```

In a separate terminal:

```bash
curl -X POST http://localhost:3000/api/assistant \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role":"user","content":"How many open issues are there?"}],
    "org": {"name":"AIGA Construction"},
    "project": {"name":"Highland Tower Phase 2","status":"active","location":"Dallas, TX"},
    "user": {"name":"Test User","role":"Project Manager"},
    "enabledModules": ["fix","cru","inspect"]
  }'
```

Expected: a streaming response with `data:` prefixed lines ending in `data: [DONE]`. The content should reference the mock issues by count or ID.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/assistant/route.ts
git commit -m "feat(assistant): add streaming API route with Claude haiku"
```

---

## Task 4: Adopt useChat in AssistantPanel

**Files:**
- Modify: `src/components/layout/AssistantPanel.tsx`

- [ ] **Step 1: Replace AssistantPanel.tsx**

Replace the full file content with:

```tsx
"use client";

import React, { useRef, useEffect } from "react";
import { useChat } from "ai/react";
import { X, Sparkles, Send, Building, FolderOpen, ChevronRight, Loader2 } from "lucide-react";
import { useUI }  from "@/providers/UIProvider";
import { useOrg } from "@/providers/OrgProvider";

export function AssistantPanel() {
  const { isAssistantOpen, closeAssistant } = useUI();
  const { currentOrganization, currentProject, currentUser, enabledModules } = useOrg();

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, append } = useChat({
    api: "/api/assistant",
    body: {
      org:            currentOrganization,
      project:        currentProject,
      user:           currentUser,
      enabledModules,
    },
  });

  const SUGGESTIONS = [
    "Summarize open issues on this project",
    "Show crew status for today",
    "Latest inspection findings",
  ];

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
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onSuggestion={(text) => append({ role: "user", content: text })}
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
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onSuggestion={(text) => append({ role: "user", content: text })}
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
  orgName:       string;
  projectName:   string;
  messages:      { id: string; role: "user" | "assistant"; content: string }[];
  input:         string;
  isLoading:     boolean;
  error:         Error | undefined;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit:      (e: React.FormEvent<HTMLFormElement>) => void;
  onSuggestion:  (text: string) => void;
  onClose:       () => void;
  suggestions:   string[];
}

function AssistantContent({ orgName, projectName, messages, input, isLoading, error, onInputChange, onSubmit, onSuggestion, onClose, suggestions }: ContentProps) {
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
                  onClick={() => onSuggestion(prompt)}
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
              const isStreamingThis = isLoading && msg.role === "assistant" && i === messages.length - 1;
              return (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-[var(--radius-card)] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-gold/15 text-content-primary border border-gold/20"
                      : "bg-surface-overlay border border-surface-border text-content-secondary"
                  }`}>
                    {msg.content}
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
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={onInputChange}
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/tui/aigacp
npx tsc --noEmit 2>&1 | grep "AssistantPanel"
```

Expected: no output.

- [ ] **Step 3: Start dev server and test in browser**

```bash
npm run dev
```

Open http://localhost:3000, click the **AI** button in the topbar. Verify:
- Panel slides open
- Welcome screen shows suggestions
- Clicking a suggestion sends the message
- Response streams in token by token
- Send button shows spinner while loading
- Input is disabled during generation
- After response completes, input re-enables

- [ ] **Step 4: Test error state**

Temporarily set `ANTHROPIC_API_KEY=bad_key` in `.env.local`, restart dev server, send a message. Verify the red "Something went wrong — try again." bubble appears.

Restore the real key and restart.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AssistantPanel.tsx
git commit -m "feat(assistant): wire real Claude streaming via useChat"
```

---

## Task 5: Final verification and cleanup

**Files:**
- No new files — verification only

- [ ] **Step 1: Full type check**

```bash
cd /Users/tui/aigacp
npx tsc --noEmit
```

Expected: zero new errors introduced by this feature.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Fix any lint errors before committing.

- [ ] **Step 3: Manual end-to-end test checklist**

With `npm run dev` running, verify each of these:

- [ ] Open panel → see welcome screen and suggestions
- [ ] Click suggestion "Summarize open issues" → AI responds with real issue data (Cat 330, crew T-3, INS-084, etc.)
- [ ] Type a custom message and hit Enter → streams response
- [ ] Close panel → reopen → messages reset (no persistence)
- [ ] Switch project via ProjectSelector → body context updates on next message
- [ ] Switch role via DevRoleSwitcher → role in context updates on next message
- [ ] Mobile: open in narrow viewport → panel appears as bottom sheet

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(assistant): shell assistant live with Claude streaming

Replaces hardcoded stub with real Claude AI. Streams responses
token-by-token, injects current org/project/role and mock data
into the system prompt so the AI can answer project questions.

No PE dependency — AI is a shell concern per architecture doc."
```
