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
    maxOutputTokens: 1024,
  });

  return result.toUIMessageStreamResponse();
}
