# Phase 3 — Workers: AIGACP Supabase as Source of Truth

**Date:** 2026-04-26  
**Status:** Approved for implementation  
**Scope:** Workers table only — all other data remains mock

---

## Goal

Replace `MOCK_WORKERS` as the seed source for OrgProvider with real worker records stored in AIGACP's own Supabase project. Workers are seeded once from CRU via a script. AIGACP becomes the owner of worker records; CRU write-back is out of scope for this phase.

---

## Architecture

```
Root Shell Layout (server component)
  → fetchOrgWorkers(orgId)           — hits AIGACP Supabase (service role, server-only)
  → passes initialWorkers: OrgWorker[]
    → OrgProvider (client component)
        → seeds workers state from initialWorkers
        → fallback: getOrgWorkforceLocal() → MOCK_WORKERS if empty or fetch fails
```

The service role key never reaches the browser. If Supabase is unreachable, the fallback is silent — the demo continues with mock workers.

---

## Supabase Schema

```sql
create table workers (
  id          text primary key,
  org_id      text not null,
  name        text not null,
  role        text not null,
  project_id  text,
  site_name   text,
  available   boolean not null default true,
  skills      text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index on workers (org_id);
```

Maps 1:1 to `OrgWorker`. Skills start empty — filled via the worker inspector panel. No RLS — service role key bypasses it.

---

## Dependencies

```bash
npm install @supabase/supabase-js dotenv
```

`dotenv` is for the seed script only — Next.js loads `.env.local` automatically at runtime.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/supabase/client.ts` | Create | Server-only Supabase client using service role key |
| `src/lib/supabase/workers.ts` | Create | `fetchOrgWorkers(orgId): Promise<OrgWorker[]>` |
| `scripts/seed-workers.ts` | Create | One-time CRU → AIGACP Supabase seed script |
| `src/app/(shell)/layout.tsx` | Modify | Fetch workers server-side, pass to OrgProvider |
| `src/providers/OrgProvider.tsx` | Modify | Accept `initialWorkers?: OrgWorker[]` prop, seed state |

**Note:** Verify `src/app/(shell)/layout.tsx` has no `"use client"` directive — it must remain a server component for the async fetch to work.

---

## Seed Script

`scripts/seed-workers.ts` — run once with `npx tsx scripts/seed-workers.ts <orgId>`

```
1. Load .env.local via dotenv
2. POST to CRU edge function:
     ${CRU_SUPABASE_URL}/functions/v1/ops-api
     Authorization: Bearer ${CRU_OPS_INTERNAL_API_KEY}
     body: { action: "getWorkersForOrg", orgId }
3. Map CruWorker → workers row:
     { id, org_id: orgId, name, role, project_id: siteId, site_name, available, skills: [] }
4. Upsert into AIGACP Supabase workers table (on conflict id → update name, role, available)
5. Log: inserted/updated count
```

Upsert on `id` makes the script safe to re-run. New hires in CRU can be synced by re-running.

---

## OrgProvider Change

```ts
// Before
function OrgProvider({ children }: { children: React.ReactNode })

// After
function OrgProvider({ children, initialWorkers = [] }: {
  children:       React.ReactNode;
  initialWorkers?: OrgWorker[];
})
```

State seed logic:

```ts
const [workers, setWorkers] = useState<OrgWorker[]>(() =>
  initialWorkers.length > 0
    ? initialWorkers
    : getOrgWorkforceLocal(config.org.id)
);
```

---

## Shell Layout Change

`src/app/(shell)/layout.tsx` converts to an async server component:

```ts
import { fetchOrgWorkers } from "@/lib/supabase/workers";

export default async function ShellLayout({ children }) {
  const workers = await fetchOrgWorkers(MOCK_ORG_CONFIG.org.id); // "org_aiga_001"
  return (
    <OrgProvider initialWorkers={workers}>
      {children}
    </OrgProvider>
  );
}
```

---

## Fallback Behavior

| Condition | Result |
|-----------|--------|
| Supabase reachable, workers exist | Real workers loaded |
| Supabase reachable, table empty | Falls back to MOCK_WORKERS |
| Supabase unreachable | Falls back to MOCK_WORKERS |
| .env vars missing | Falls back to MOCK_WORKERS |

Demo never breaks regardless of Supabase state.

---

## Out of Scope

- Write-back from AIGACP → CRU (planned separately)
- Auth / RLS / multi-user access
- Any other entity (projects, assets, issues, crews) — all remain mock
- Real-time sync / webhooks
