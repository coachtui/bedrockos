import { generateText } from "ai";
import { anthropic }    from "@ai-sdk/anthropic";
import { NextResponse }  from "next/server";
import { getSessionUser } from "@/lib/supabase/ssr";
import type { ScheduleActivity } from "@/lib/schedule/types";

export const runtime = "nodejs";

const MODEL_ID       = "claude-haiku-4-5-20251001";
const MAX_BODY_BYTES = 50_000;

interface ChatRequest {
  message:    string;
  activities: ScheduleActivity[];
  projectId:  string;
}

interface ChatResponse {
  intent_type:  "mark_complete" | "push_date" | "add_note";
  activity_id:  string | null;
  days:         number | null;
  reply:        string;
}

function buildSystemPrompt(activities: ScheduleActivity[], today: string): string {
  const active = activities.filter((a) => a.status !== "complete");
  const activityList = active.length > 0
    ? active.map((a) =>
        `  - [${a.id}] ${a.name} (${a.phase}) | ${a.startDate} → ${a.endDate} | status: ${a.status}`
      ).join("\n")
    : "  (no active activities)";

  return `You are a schedule assistant for a construction project. You ONLY respond to messages about the schedule activities listed below. For anything unrelated, tell the user you can only help with schedule questions.

Today is ${today}.

Current schedule activities:
${activityList}

Respond with valid JSON only — no markdown, no code fences, just the raw JSON object:
{
  "intent_type": "mark_complete" | "push_date" | "add_note",
  "activity_id": "<id from list above, or null>",
  "days": <integer days to push, only for push_date, otherwise null>,
  "reply": "<short conversational reply, 1-2 sentences>"
}

Rules:
- "mark_complete" when the user says an activity is done, finished, complete, wrapped up, etc.
- "push_date" when the user wants to push, delay, extend, or postpone an activity; default to 7 days if unspecified
- "add_note" for questions, status updates, or anything that doesn't change dates or completion
- Match the activity by name — pick the closest match from the list
- If the message is unrelated to this schedule, use "add_note" with null activity_id and explain in reply that you can only assist with schedule-related questions`;
}

function parseResponse(text: string): ChatResponse {
  // Strip any accidental markdown fences
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Partial<ChatResponse>;
    return {
      intent_type:  parsed.intent_type  ?? "add_note",
      activity_id:  parsed.activity_id  ?? null,
      days:         parsed.days         ?? null,
      reply:        parsed.reply        ?? "Got it.",
    };
  } catch {
    return { intent_type: "add_note", activity_id: null, days: null, reply: text.trim() };
  }
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  let body: ChatRequest;
  try {
    body = JSON.parse(raw) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { message, activities, projectId } = body;
  if (
    typeof message    !== "string" || !message.trim()     ||
    !Array.isArray(activities)                            ||
    typeof projectId  !== "string" || !projectId.trim()
  ) {
    return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  const { text } = await generateText({
    model:           anthropic(MODEL_ID),
    system:          buildSystemPrompt(activities, today),
    prompt:          message,
    maxOutputTokens: 300,
  });

  const result = parseResponse(text);
  return NextResponse.json(result);
}
