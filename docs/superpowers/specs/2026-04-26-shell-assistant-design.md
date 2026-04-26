# Shell Assistant — Real Claude AI via Vercel AI SDK

**Date:** 2026-04-26  
**Status:** Approved  
**Scope:** Replace mocked `AssistantPanel` with a streaming Claude-backed assistant. `SearchModal` is out of scope.

---

## Overview

The AIGA Shell Assistant panel (`AssistantPanel.tsx`) currently returns a hardcoded stub response. This spec wires it to the Claude API using the Vercel AI SDK, giving the shell a real AI that is aware of the current org, project, role, and mock data.

This is a shell concern — the Architecture doc explicitly lists AI under platform/shell ownership. No PE module dependency.

---

## Architecture

One new API route. The existing `AssistantPanel` client component is updated to use `useChat`. All other files are untouched.

```
Client (AssistantPanel)             Server (route.ts)
    useChat()            →          POST /api/assistant
      messages                        build system prompt
      input / isLoading               inject context + mock data
      append()             ←          streamText → streaming response
```

### New file

`src/app/api/assistant/route.ts`

- Receives: `{ messages, org, project, user, enabledModules }` in the POST body
- Builds system prompt server-side with context and serialized mock data imported from `src/lib/mock/` (issues, alerts, crews, assets)
- Calls `streamText` from `ai` with `@ai-sdk/anthropic` provider
- Returns a streaming response via `result.toDataStreamResponse()`

### Modified file

`src/components/layout/AssistantPanel.tsx`

- Removes manual `messages`, `input`, `handleSend` state
- Adopts `useChat({ api: "/api/assistant", body: { org, project, user, enabledModules } })`
- Uses `useOrg()` to populate the body context
- Streaming renders naturally — `useChat` messages have the same `role: "user" | "assistant"` shape as the current mock

---

## System Prompt

Built server-side per request. Structure:

```
You are the AIGA Shell Assistant for {org.name}.
You help users navigate the platform, surface project status, and coordinate across modules.
Be concise and direct. Use construction industry terminology naturally.

Current context:
- Project: {project.name} ({project.status}, {project.location})
- User: {user.name}, role: {roleLabel}
- Enabled modules: {enabledModules.join(", ")}

Project data:
- Open issues: [{id, title, severity, module}, ...]
- Active alerts: [{id, title, type}, ...]
- Crew roster: [{name, memberCount, status}, ...]
- Assets: [{id, name, status, linkedIssues}, ...]
```

Mock data is serialized as compact JSON inline. The system prompt block is eligible for Anthropic prompt caching (stable across turns in a session), keeping repeated-turn costs low.

---

## Streaming UX

| State | Behavior |
|---|---|
| Idle | Input enabled, send button active |
| Generating | Gold pulsing dot in panel header; cursor blinks at end of streaming text; input disabled |
| Complete | Input re-enables; full message renders |
| Error | Inline error in assistant bubble: "Something went wrong — try again." Re-submitting the last message retries. |

No toast, no modal, no full-panel error state.

---

## Message Persistence

Messages live in `useChat` component state — they reset when the panel closes. No persistence in Phase 1/2. Phase 3 (real backend) is the right time to add conversation history storage.

---

## Dependencies

```bash
npm install ai @ai-sdk/anthropic
```

New env var (server-side only, no `NEXT_PUBLIC_` prefix):

```
ANTHROPIC_API_KEY=sk-ant-...
```

Add to `.env.local`.

---

## Out of Scope

- `SearchModal` — stays mocked; needs a real data index before it's useful
- Conversation history persistence — Phase 3
- Tool use / function calling — future iteration
- Role-gating the assistant — all roles have access for now

---

## Files Changed

| File | Change |
|---|---|
| `src/app/api/assistant/route.ts` | New — streaming API route |
| `src/components/layout/AssistantPanel.tsx` | Modified — adopt `useChat`, add streaming UX |
| `.env.local` | Add `ANTHROPIC_API_KEY` |
| `package.json` | Add `ai`, `@ai-sdk/anthropic` |
