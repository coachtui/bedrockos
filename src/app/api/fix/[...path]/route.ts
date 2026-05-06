import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/ssr";

const FIX_BACKEND_URL = process.env.FIX_BACKEND_URL;

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await params, "GET");
}
export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await params, "POST");
}
export async function PUT(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await params, "PUT");
}
export async function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, await params, "DELETE");
}

async function proxy(
  request: Request,
  params: { path: string[] },
  method: string,
): Promise<Response> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!FIX_BACKEND_URL) {
    return NextResponse.json({ error: "Fix service not configured" }, { status: 503 });
  }

  const url    = new URL(request.url);
  const target = `${FIX_BACKEND_URL}/api/${params.path.join("/")}${url.search}`;

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  // Forward the BedrockOS org context so Fix can scope data if needed
  headers.set("X-Bedrock-Org-Id", process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "");

  const body = method !== "GET" && method !== "DELETE"
    ? await request.text()
    : undefined;

  try {
    const res = await fetch(target, { method, headers, body });
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Fix service unreachable" }, { status: 502 });
  }
}
