# Core Data Ingestion & Ownership Design

Date: 2026-04-14  
Status: Approved  
Phase coverage: Architecture (Phase 3) + Implementation (Phase 1–2)

---

## 1. Problem Statement

AIGACP needs a definitive answer to three questions:

1. Where does workforce data live? (AIGACP vs CRU)
2. How do entities get created? (projects, assets, crews, workers)
3. How does activity get generated across all modules?

Currently workforce is pulled from CRU because CRU was built first. AIGACP should be the parent platform. CRU should become a downstream consumer, not a data source.

---

## 2. Data Ownership Architecture

### Decision

AIGACP is the source of truth for all platform entities. CRU reads the org roster from AIGACP. CRU writes operational state (assignments, schedules, availability) to its own tables only.

### Entity Ownership

| Entity | Owner | Notes |
|--------|-------|-------|
| orgs | AIGACP | top-level tenant |
| users | AIGACP | people with logins |
| projects | AIGACP | operational units |
| assets | AIGACP | equipment registry |
| workers | AIGACP | field labor roster |
| crews | AIGACP | project-scoped teams |
| crew_members | AIGACP | join: crews ↔ workers |
| assignments | CRU | who is assigned where, when |
| schedules | CRU | pour events, site events |
| availability | CRU | worker availability state |
| diagnostic sessions | Fix | equipment diagnostic state |
| inspections | Inspect | inspection records |
| work orders | MX | maintenance work orders |

### Phase 3 Schema

```sql
orgs
  id            uuid primary key
  name          text not null
  slug          text unique not null
  plan          text not null default 'starter'
  created_at    timestamptz default now()

users
  id            uuid primary key  -- = Supabase auth.users.id
  org_id        uuid references orgs(id)
  name          text not null
  email         text not null
  role          text not null  -- owner | admin | pm | project_engineer | superintendent | foreman | mechanic
  created_at    timestamptz default now()

projects
  id            uuid primary key
  org_id        uuid references orgs(id)
  name          text not null
  slug          text not null
  status        text not null  -- planning | active | on_hold | completed
  phase         text
  location      text
  pm_user_id    uuid references users(id)
  start_date    date
  end_date      date
  progress_pct  int default 0
  created_at    timestamptz default now()

assets
  id            uuid primary key
  org_id        uuid references orgs(id)
  project_id    uuid references projects(id)
  name          text not null
  type          text not null  -- Excavator | Crane | Dozer | Pump | Lift | ...
  status        text not null  -- active | maintenance | offline
  last_seen     timestamptz
  created_at    timestamptz default now()

workers
  id            uuid primary key
  org_id        uuid references orgs(id)
  name          text not null
  role          text not null  -- mechanic | driver | mason | foreman | superintendent | ...
  user_id       uuid references users(id)  -- nullable: populated if worker has AIGACP login
  created_at    timestamptz default now()

crews
  id            uuid primary key
  org_id        uuid references orgs(id)
  project_id    uuid references projects(id)
  name          text not null
  created_at    timestamptz default now()

crew_members
  crew_id       uuid references crews(id)
  worker_id     uuid references workers(id)
  primary key (crew_id, worker_id)

activity_events
  id            uuid primary key
  org_id        uuid references orgs(id)
  project_id    uuid references projects(id)
  actor_user_id uuid references users(id)  -- nullable: proxy-entered events have no user
  actor_name    text not null
  action        text not null
  entity_type   text not null
  entity_name   text not null
  module        text not null
  target_type   text
  target_id     uuid
  timestamp     timestamptz default now()
```

### workers.user_id — the link rule

Workers are roster entries. Users are auth accounts. Some workers have AIGACP logins; most don't.

- `workers.user_id` is null until a worker is given an account
- When a worker logs in, the platform resolves their project context, crew, and assignments automatically via the linked worker record
- Activity events use `actor_name` (denormalized) so events remain readable even if a worker record is later deleted

### CRU Integration — inversion in Phase 3

Today: AIGACP calls CRU to get workers → `src/lib/integrations/cru.ts`  
Phase 3: CRU calls AIGACP to get the org roster → AIGACP exposes a `/api/roster` endpoint (service key, server-only)

CRU's assignment/schedule tables stay in CRU's Supabase. The adapter in `src/lib/integrations/cru.ts` is retained for CRU's operational state (schedules, site events, availability) — only the worker fetch direction inverts.

### CRU Migration Path

1. Build AIGACP Supabase schema (this spec)
2. Export CRU's worker and site records
3. Seed AIGACP `workers`, `projects`, `crews` tables from export
4. Update CRU adapter: worker fetches point to AIGACP `/api/roster`
5. CRU operational state (assignments, schedules) stays untouched in CRU DB

No disruption to CRU users during transition — the adapter's mock fallback keeps the UI functional throughout.

---

## 3. Activity Generation Model

### Two sources

**Module-emitted (human action)**  
When a user takes an action in any module, the module calls `useShellEmitter().emitActivity()`. This is already the pattern — `FixEscalateButton` is the first implementation.

Actions that must be wired per module:

| Module | Events to emit |
|--------|---------------|
| Shell | project created, asset added, crew created, worker imported |
| CRU | crew schedule changed, worker assigned, clock-in anomaly flagged |
| Fix | fault flagged, diagnostic session started, service scheduled |
| MX | work order opened / closed / blocked, parts ordered |
| OPS | pour scheduled / confirmed, resource request submitted / filled |
| Inspect | inspection submitted, sign-off approved / rejected |
| Datum | drawing uploaded, layout point published |

**System-generated (Phase 3)**  
DB triggers or edge functions emit activity when state thresholds are crossed — asset goes offline, issue severity escalates, work order goes overdue. These don't require a human action.

### Phase 1–2 behavior

- `MOCK_ACTIVITY` seeds the feed (never empty on first load)
- `useShellEmitter` pushes live events into OrgProvider in-memory state
- Shell merges both sources, sorts by timestamp descending

### Phase 3 swap

`useShellEmitter` POSTs to `/api/activity` instead of mutating OrgProvider. OrgProvider subscribes to the `activity_events` table via Supabase Realtime. No call sites in modules change.

---

## 4. Phase 1–2 Entity Creation Flows

### OrgProvider additions required

```ts
// State additions
workers:  OrgWorker[]
crews:    OrgCrew[]

// Mutators (same pattern as addEmittedIssue / addEmittedActivity)
addProject(input: CreateProjectInput): Project
addAsset(input: CreateAssetInput): Asset
addWorker(input: CreateWorkerInput): OrgWorker         // used by CSV import
addCrew(input: CreateCrewInput): OrgCrew
addWorkerToCrew(crewId: string, workerId: string): void
```

All mutators emit an activity event via the existing emitter.

### Flow 1 — Create Project

Entry point: Projects page header, Dashboard quick action.

Fields: name, location, phase, start date, end date, PM (select from users list).

On submit:
- Adds to OrgProvider projects array
- Emits: `"[currentUser] created project [name]"` — module: shell

### Flow 2 — Add Asset

Entry point: Project command center Assets tab, standalone Assets page.

Fields: name, type (dropdown: Excavator / Crane / Dozer / Pump / Lift / Other), status, project assignment.

Supports two entry modes:
- Single form
- CSV import (see Flow 5)

On submit:
- Adds to OrgProvider assets array
- Emits: `"[currentUser] added [asset name] to [project name]"` — module: shell

### Flow 3 — Create Crew

Entry point: Project command center Crews tab.

Step 1 — Crew details: name, project (pre-filled if launched from project context).  
Step 2 — Add workers: select from org worker roster. Multi-select.

On submit:
- Adds crew + crew_members to OrgProvider
- Emits: `"[currentUser] created [crew name]"` — module: shell
- Emits per assignment: `"[currentUser] assigned [worker name] to [crew name]"` — module: shell

### Flow 4 — Onboarding Wizard

First-time setup for a new org. In Phase 1–2: accessible via a dedicated `/onboarding` route and linked from the dashboard when the mock org has no projects. In Phase 3: triggered automatically on first login when the org has no projects.

Steps:
1. Org details (name, slug) — pre-filled if coming from signup
2. Import workers (CSV or skip)
3. Import assets (CSV or skip)
4. Create first project

Each step is skippable. Wizard state lives in local component state only — not persisted. On complete, drops user into the dashboard with their data visible.

### Flow 5 — CSV Import (Workers + Assets)

Entry points:
- Onboarding wizard steps 2 and 3
- Workers page "Import CSV" button
- Assets page "Import CSV" button

**Workers CSV expected columns:**
```
name (required), role (required), crew (optional)
```

If `crew` is present and matches an existing crew name (case-insensitive), the worker is added to that crew automatically. If the crew name does not exist, the row is imported but the crew assignment is skipped — flagged in the preview with a warning, not an error.

**Assets CSV expected columns:**
```
name (required), type (required), status (optional), project (optional)
```

**Import flow:**
1. File picker — accepts `.csv`
2. Column mapper — user confirms which column maps to which field (handles varied header names)
3. Preview table — shows parsed rows, flags rows with missing required fields in red
4. Confirm import — bulk-adds to OrgProvider, emits single summary event: `"[currentUser] imported [n] workers"` / `"[currentUser] imported [n] assets"`

**Phase 3 swap:** same UI, POST to `/api/import/workers` or `/api/import/assets`. Backend validates and bulk-inserts.

### What is NOT in Phase 1–2 scope

- Edit / delete flows (add-only)
- Worker creation via form (workers come from CSV import or CRU migration)
- User management (no auth yet)
- Org creation (single org context in Phase 1–2)

---

## 5. Mock Data Contract

Phase 1–2 mock files must mirror the Phase 3 schema so the swap is a straight replacement.

`MOCK_WORKERS` replaces `MOCK_CRU_WORKERS` as the org worker roster:

```ts
// src/lib/mock/workers.ts
export const MOCK_WORKERS: OrgWorker[] = [
  { id: "worker_001", orgId: "org_001", name: "Tony Reeves",  role: "mechanic", userId: null, ... },
  // ... mirrors current MOCK_CRU_WORKERS with added orgId and userId fields
]
```

`OrgWorkforceRegistry` reads from `MOCK_WORKERS` in Phase 1–2 instead of the CRU adapter. The adapter is retained for CRU operational state (schedules, availability).

---

## 6. Implementation Order

1. Update `OrgWorkforceRegistry` to read from new `MOCK_WORKERS` (decouple from CRU adapter for roster reads)
2. Add OrgProvider state + mutators for workers, crews, projects, assets
3. Build Create Project flow
4. Build Add Asset flow (form only)
5. Build Create Crew + assign workers flow
6. Build CSV import (workers first, then assets)
7. Build Onboarding wizard (wraps flows 3–5)
8. Wire `emitActivity` across remaining modules (CRU, MX, OPS, Inspect, Datum)
9. Supabase schema + migrations (Phase 3 start)
10. CRU roster fetch inversion
