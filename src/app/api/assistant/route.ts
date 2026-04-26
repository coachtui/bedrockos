import { streamText, type ModelMessage } from "ai";
import { anthropic }  from "@ai-sdk/anthropic";
import { NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/assistant/system-prompt";

export const runtime = "nodejs";

const KNOWN_ROLES    = new Set(["owner", "admin", "pm", "project_engineer", "superintendent", "foreman", "mechanic", "viewer"]);
const KNOWN_MODULES  = new Set(["cru", "fix", "inspect", "datum", "mx", "ops"]);
const MAX_MESSAGES   = 50;
const MAX_BODY_BYTES = 100_000;
const MODEL_ID       = "claude-haiku-4-5-20251001";

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 },
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages, org, project, user, enabledModules } = body as {
    messages:      unknown;
    org:           unknown;
    project:       unknown;
    user:          unknown;
    enabledModules: unknown;
  };

  if (
    !Array.isArray(messages) ||
    !isStringRecord(org)     ||
    !isStringRecord(project) ||
    !isStringRecord(user)    ||
    typeof org.name     !== "string" || !org.name.trim()     ||
    typeof project.name !== "string" || !project.name.trim() ||
    typeof user.name    !== "string" || !user.name.trim()     ||
    typeof user.role    !== "string"
  ) {
    return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
  }

  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: "Too many messages" }, { status: 400 });
  }

  const safeRole    = KNOWN_ROLES.has(user.role)   ? user.role   : "viewer";
  const safeModules = Array.isArray(enabledModules)
    ? (enabledModules as unknown[]).filter((m): m is string => typeof m === "string" && KNOWN_MODULES.has(m))
    : [];

  const systemPrompt = buildSystemPrompt({
    org:            { name: org.name },
    project:        { name: project.name, status: typeof project.status === "string" ? project.status : "active", location: typeof project.location === "string" ? project.location : undefined },
    user:           { name: user.name, role: safeRole },
    enabledModules: safeModules,
  });

  const result = await streamText({
    model:           anthropic(MODEL_ID),
    system:          systemPrompt,
    messages:        messages as ModelMessage[],
    maxOutputTokens: 1024,
  });

  return result.toUIMessageStreamResponse();
}

function isStringRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
