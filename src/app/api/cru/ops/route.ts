/**
 * CRU OPS Proxy
 *
 * Server-side proxy to CRU's `ops-api` Supabase edge function.
 * Forwards POST requests from OPS pages to CRU using a trusted
 * internal API key — the key never leaves the server.
 *
 * Call site: src/lib/integrations/cru.ts (cruPost helper)
 * Upstream:  ${CRU_SUPABASE_URL}/functions/v1/ops-api
 *
 * Required server env vars (set in .env.local — never NEXT_PUBLIC_):
 *   CRU_SUPABASE_URL         — CRU Supabase project URL
 *   CRU_OPS_INTERNAL_API_KEY — shared secret from CRU Supabase secrets
 *
 * If either env var is missing the route returns 503 and the adapter
 * falls back to mock data automatically.
 */

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/ssr";

const CRU_SUPABASE_URL        = process.env.CRU_SUPABASE_URL;
const CRU_OPS_INTERNAL_API_KEY = process.env.CRU_OPS_INTERNAL_API_KEY;

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Config check — fail fast, adapter falls back to mock ─────────────────
  if (!CRU_SUPABASE_URL || !CRU_OPS_INTERNAL_API_KEY) {
    return NextResponse.json(
      { error: "CRU integration not configured" },
      { status: 503 },
    );
  }

  // ── Parse request body ────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // ── Forward to CRU ────────────────────────────────────────────────────────
  try {
    const res = await fetch(`${CRU_SUPABASE_URL}/functions/v1/ops-api`, {
      method:  "POST",
      headers: {
        "Content-Type":     "application/json",
        "x-internal-api-key": CRU_OPS_INTERNAL_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data: unknown = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    // CRU unreachable — adapter will use mock fallback
    return NextResponse.json(
      { error: "CRU service unavailable" },
      { status: 502 },
    );
  }
}
