import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/ssr";
import { fetchOrgUserByAuthId } from "@/lib/supabase/org-users";

const FIX_BACKEND_URL = process.env.FIX_BACKEND_URL;
const FIX_PARTNER_KEY = process.env.FIX_PARTNER_KEY;

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

  if (!FIX_BACKEND_URL || !FIX_PARTNER_KEY) {
    return NextResponse.json({ error: "Fix service not configured" }, { status: 503 });
  }

  // Resolve org membership so Fix can scope sessions per customer
  const orgUser = await fetchOrgUserByAuthId(sessionUser.id);
  const orgId   = orgUser?.org_id ?? process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "";
  const email   = orgUser?.email ?? sessionUser.email ?? "";

  const url    = new URL(request.url);
  const target = `${FIX_BACKEND_URL}/api/${params.path.join("/")}${url.search}`;

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  // Partner-auth handshake — Fix backend trusts these because of FIX_PARTNER_KEY
  headers.set("X-Partner-Key",        FIX_PARTNER_KEY);
  headers.set("X-Partner-User-Id",    sessionUser.id);
  headers.set("X-Partner-User-Email", email);
  headers.set("X-Partner-Org-Id",     orgId);

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
