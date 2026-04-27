# Phase 3 Workers — Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `MOCK_WORKERS` as the OrgProvider seed source with real worker records fetched server-side from AIGACP's Supabase project, seeded once from CRU.

**Architecture:** The shell layout is split into a server component (async, fetches workers from Supabase) and a client component (ShellLayout + OpsLayer, unchanged). OrgProvider accepts an `initialWorkers` prop and falls back to `MOCK_WORKERS` silently if Supabase is unavailable. A one-time seed script pulls real workers from the CRU edge function and upserts them into AIGACP Supabase.

**Tech Stack:** Next.js App Router, `@supabase/supabase-js`, `dotenv`, `npx tsx`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/supabase/client.ts` | Create | Server-only Supabase client (service role key) |
| `src/lib/supabase/workers.ts` | Create | `fetchOrgWorkers(orgId)` → `OrgWorker[]` |
| `scripts/seed-workers.ts` | Create | One-time: pull CRU workers → upsert AIGACP Supabase |
| `src/app/(shell)/shell-client.tsx` | Create | Extract client-only shell components from layout |
| `src/app/(shell)/layout.tsx` | Modify | Remove `"use client"`, make async, fetch + pass workers |
| `src/providers/OrgProvider.tsx` | Modify | Accept `initialWorkers?: OrgWorker[]`, seed state from it |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install packages**

```bash
cd /Users/tui/aigacp
npm install @supabase/supabase-js dotenv
```

Expected: both packages appear in `package.json` dependencies and `node_modules`.

- [ ] **Step 2: Verify TypeScript resolves them**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | head -5
```

Expected: no new errors about missing modules.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @supabase/supabase-js and dotenv"
```

---

## Task 2: Supabase server client + workers fetch

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/workers.ts`

- [ ] **Step 1: Create `src/lib/supabase/client.ts`**

```ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export const supabase = createClient(url, key);
```

- [ ] **Step 2: Create `src/lib/supabase/workers.ts`**

```ts
import { supabase } from "./client";
import type { OrgWorker, WorkerRole } from "@/types/domain";

const KNOWN_ROLES = new Set<WorkerRole>([
  "mechanic", "driver", "mason", "carpenter",
  "foreman", "superintendent", "operator", "laborer",
]);

function toWorkerRole(r: string): WorkerRole {
  return KNOWN_ROLES.has(r as WorkerRole) ? (r as WorkerRole) : "laborer";
}

export async function fetchOrgWorkers(orgId: string): Promise<OrgWorker[]> {
  try {
    const { data, error } = await supabase
      .from("workers")
      .select("id, org_id, name, role, project_id, site_name, available, skills")
      .eq("org_id", orgId);

    if (error || !data) return [];

    return data.map((row) => ({
      id:        row.id,
      orgId:     row.org_id,
      name:      row.name,
      role:      toWorkerRole(row.role),
      userId:    null,
      projectId: row.project_id ?? undefined,
      siteName:  row.site_name ?? undefined,
      available: row.available,
      skills:    row.skills ?? [],
    }));
  } catch {
    return [];
  }
}
```

The `catch` returns `[]` so the layout fallback to `MOCK_WORKERS` always works.

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | grep "supabase"
```

Expected: no output (no errors in the new files).

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat(supabase): add server client and fetchOrgWorkers"
```

---

## Task 3: Seed script

**Files:**
- Create: `scripts/seed-workers.ts`

- [ ] **Step 1: Create `scripts/seed-workers.ts`**

```ts
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const CRU_URL     = process.env.CRU_SUPABASE_URL;
const CRU_KEY     = process.env.CRU_OPS_INTERNAL_API_KEY;
const AIGA_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const AIGA_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!CRU_URL || !CRU_KEY || !AIGA_URL || !AIGA_KEY) {
  console.error("Missing required env vars. Check .env.local.");
  process.exit(1);
}

const orgId = process.argv[2];
if (!orgId) {
  console.error("Usage: npx tsx scripts/seed-workers.ts <orgId>");
  process.exit(1);
}

const aiga = createClient(AIGA_URL, AIGA_KEY);

interface DbWorker {
  id:                  string;
  name:                string;
  role:                string;
  availability_status: string;
  job_site_id:         string | null;
  job_site:            { id: string; name: string } | null;
}

async function fetchCruWorkers(): Promise<DbWorker[]> {
  const res = await fetch(`${CRU_URL}/functions/v1/ops-api`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${CRU_KEY}`,
    },
    body: JSON.stringify({ action: "getWorkersForOrg", orgId }),
  });

  const json = await res.json() as { success?: boolean; data?: DbWorker[]; error?: string };

  if (!res.ok || !json.success || !json.data) {
    throw new Error(`CRU fetch failed: ${json.error ?? res.status}`);
  }
  return json.data;
}

async function main() {
  console.log(`Fetching workers from CRU for org: ${orgId}`);
  const cruWorkers = await fetchCruWorkers();
  console.log(`  Found ${cruWorkers.length} workers in CRU`);

  const rows = cruWorkers.map((w) => ({
    id:         w.id,
    org_id:     orgId,
    name:       w.name,
    role:       w.role,
    project_id: w.job_site_id ?? null,
    site_name:  w.job_site?.name ?? null,
    available:  w.availability_status === "available",
    skills:     [],
  }));

  const { error, count } = await aiga
    .from("workers")
    .upsert(rows, { onConflict: "id", count: "exact" });

  if (error) {
    console.error("Supabase upsert failed:", error.message);
    process.exit(1);
  }

  console.log(`  Upserted ${count ?? rows.length} workers into AIGACP Supabase`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | grep "seed-workers"
```

Expected: no output.

- [ ] **Step 3: Run the seed script**

You need your CRU org ID. If you're unsure, check the CRU Supabase dashboard — look in the `workers` or `organizations` table for your org's UUID.

```bash
cd /Users/tui/aigacp
npx tsx scripts/seed-workers.ts <your-cru-org-id>
```

Expected output:
```
Fetching workers from CRU for org: <your-cru-org-id>
  Found N workers in CRU
  Upserted N workers into AIGACP Supabase
Done.
```

- [ ] **Step 4: Verify in Supabase dashboard**

Open your AIGACP Supabase project → Table Editor → `workers`. Confirm your real worker names appear.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-workers.ts
git commit -m "feat(scripts): add CRU → AIGACP workers seed script"
```

---

## Task 4: Extract client shell components from layout

**Files:**
- Create: `src/app/(shell)/shell-client.tsx`
- Modify: `src/app/(shell)/layout.tsx`

The layout currently has `"use client"` because `ShellLayout` uses `useUI()` and `OpsLayer` uses `useMx()`. We extract those into a new file so layout can become a server component.

- [ ] **Step 1: Create `src/app/(shell)/shell-client.tsx`**

```tsx
"use client";

import { OrgProvider } from "@/providers/OrgProvider";
import { UIProvider }  from "@/providers/UIProvider";
import { MxProvider }  from "@/providers/MxProvider";
import { OpsProvider } from "@/providers/OpsProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Sidebar }     from "@/components/layout/Sidebar";
import { Topbar }      from "@/components/layout/Topbar";
import { MobileNav }   from "@/components/layout/MobileNav";
import { AssistantPanel } from "@/components/layout/AssistantPanel";
import { SearchModal } from "@/components/search/SearchModal";
import { useUI }       from "@/providers/UIProvider";
import { useMx }       from "@/providers/MxProvider";
import type { OrgWorker } from "@/types/domain";

function OpsLayer({ children }: { children: React.ReactNode }) {
  const { createWorkOrder } = useMx();
  return (
    <OpsProvider onCreateMxWorkOrder={createWorkOrder}>
      {children}
    </OpsProvider>
  );
}

function ShellLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUI();
  return (
    <>
      <Sidebar />
      <Topbar />
      <main className={`min-h-screen pt-14 transition-all duration-200 ease-in-out pl-0 ${sidebarCollapsed ? "md:pl-16" : "md:pl-60"}`}>
        <div className="pb-20 md:pb-0">{children}</div>
      </main>
      <AssistantPanel />
      <SearchModal />
      <MobileNav />
    </>
  );
}

export function ShellClientRoot({
  children,
  initialWorkers,
}: {
  children:       React.ReactNode;
  initialWorkers: OrgWorker[];
}) {
  return (
    <ThemeProvider>
      <OrgProvider initialWorkers={initialWorkers}>
        <UIProvider>
          <MxProvider>
            <OpsLayer>
              <ShellLayout>{children}</ShellLayout>
            </OpsLayer>
          </MxProvider>
        </UIProvider>
      </OrgProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Replace `src/app/(shell)/layout.tsx`**

```tsx
import { fetchOrgWorkers } from "@/lib/supabase/workers";
import { MOCK_ORG_CONFIG } from "@/lib/config/org";
import { ShellClientRoot } from "./shell-client";

export default async function ShellRootLayout({ children }: { children: React.ReactNode }) {
  const workers = await fetchOrgWorkers(MOCK_ORG_CONFIG.org.id);
  return (
    <ShellClientRoot initialWorkers={workers}>
      {children}
    </ShellClientRoot>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | grep -E "layout|shell-client"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(shell)/shell-client.tsx" "src/app/(shell)/layout.tsx"
git commit -m "refactor(layout): extract client shell — layout becomes async server component"
```

---

## Task 5: Update OrgProvider to accept initialWorkers

**Files:**
- Modify: `src/providers/OrgProvider.tsx`

- [ ] **Step 1: Update the function signature**

In `src/providers/OrgProvider.tsx`, find line 77:

```ts
export function OrgProvider({ children }: { children: React.ReactNode }) {
```

Replace with:

```ts
export function OrgProvider({
  children,
  initialWorkers = [],
}: {
  children:        React.ReactNode;
  initialWorkers?: OrgWorker[];
}) {
```

- [ ] **Step 2: Update the workers state initializer**

Find line 90:

```ts
const [workers, setWorkers]   = useState<OrgWorker[]>(MOCK_WORKERS.filter((w) => w.orgId === orgId));
```

Replace with:

```ts
const [workers, setWorkers] = useState<OrgWorker[]>(() =>
  initialWorkers.length > 0
    ? initialWorkers
    : MOCK_WORKERS.filter((w) => w.orgId === orgId),
);
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/tui/aigacp && npx tsc --noEmit 2>&1 | grep "OrgProvider"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/providers/OrgProvider.tsx
git commit -m "feat(org): accept initialWorkers prop — seeds from Supabase, falls back to mock"
```

---

## Task 6: Browser verification

- [ ] **Step 1: Start dev server**

```bash
cd /Users/tui/aigacp && npm run dev
```

- [ ] **Step 2: Verify real workers load**

Open http://localhost:3000/workers

Confirm the workers listed are your real CRU workers (names you recognize), not the mock names like "Tony Reeves" or "Derek Walsh".

- [ ] **Step 3: Verify MX scheduling shows real workers**

Open http://localhost:3000/modules/mx/scheduling

Confirm the mechanics panel on the right shows your real mechanics from CRU.

- [ ] **Step 4: Verify worker inspector works**

Click a worker card on the workers page. Confirm the inspector panel opens with the real worker's name and role.

- [ ] **Step 5: Verify fallback still works**

Temporarily rename `.env.local` to `.env.local.bak`, restart dev server, open http://localhost:3000/workers.

Expected: mock workers appear (Tony Reeves, Derek Walsh, etc.) — no crash, no error page.

Rename back: `mv .env.local.bak .env.local` and restart.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(phase3): workers now live in AIGACP Supabase — seeded from CRU

OrgProvider seeds from Supabase on server render. Falls back to
MOCK_WORKERS silently if Supabase is unavailable. Seed script
pulls real workers from CRU and upserts into AIGACP."
```
