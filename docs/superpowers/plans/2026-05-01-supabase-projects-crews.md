# Supabase Persistence — Projects & Crews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make projects and crews persist across dev server restarts by reading from and writing to Supabase, following the pattern already established for workers.

**Architecture:** The shell layout (`layout.tsx`) is a Next.js server component that already fetches workers from Supabase and passes them as `initialWorkers` to `OrgProvider`. This plan extends that exact pattern to projects and crews. For writes, Next.js 15 Server Actions are called optimistically inside OrgProvider mutations — local state updates immediately, Supabase is written in the background. No page components change.

**Tech Stack:** Next.js 15 App Router, Supabase (service role key, server-only), TypeScript strict, `"use server"` Server Actions

---

## Codebase Context (read before starting)

**Established pattern — workers (already live):**
- Fetch: `src/lib/supabase/workers.ts` — `fetchOrgWorkers(orgId)` reads `workers` table, returns `OrgWorker[]`
- Shell layout: `src/app/(shell)/layout.tsx` — async server component, calls `fetchOrgWorkers`, passes `initialWorkers` to `ShellClientRoot`
- Shell client: `src/app/(shell)/shell-client.tsx` — forwards `initialWorkers` prop to `OrgProvider`
- Provider: `src/providers/OrgProvider.tsx` — accepts `initialWorkers?: OrgWorker[]`, seeds `useState` from it (falls back to mock if empty)

**Supabase client:** `src/lib/supabase/client.ts` — marked `server-only`. Uses `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Import only from server files and Server Actions.

**Org ID:** `process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001"` — used as the `org_id` filter in all Supabase queries and inserts. This is already the pattern in `layout.tsx`.

**Key types** (in `src/types/domain.ts`):
```ts
interface Project {
  id; name; slug; status: ProjectStatus; phase; location; pm_name;
  progress_pct: number; open_issues: number; last_activity: string;
  start_date: string; end_date: string; description?: string; award_price?: number;
}
interface OrgCrew {
  id; orgId; projectId; name; memberIds: string[];
  leadName?: string; status?: CrewStatus;
}
type UpdateProjectInput = Partial<Pick<Project,
  "name" | "location" | "phase" | "pm_name" | "status" |
  "start_date" | "end_date" | "description" | "award_price"
>>;
```

**OrgProvider current state seeds (to replace):**
- `const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS)` — line ~102
- `const [crews, setCrews] = useState<OrgCrew[]>(seedCrews(orgId))` — line ~108

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/supabase/projects.ts` | Create | Read `projects` table → `Project[]` |
| `src/lib/supabase/crews.ts` | Create | Read `crews` + `crew_members` tables → `OrgCrew[]` |
| `src/lib/actions/projects.ts` | Create | Server Actions: insert/update `projects` table |
| `src/lib/actions/crews.ts` | Create | Server Actions: insert/update `crews` + `crew_members` tables |
| `src/app/(shell)/layout.tsx` | Modify | Fetch projects + crews alongside workers |
| `src/app/(shell)/shell-client.tsx` | Modify | Pass `initialProjects` + `initialCrews` props |
| `src/providers/OrgProvider.tsx` | Modify | Accept new initial props; call Server Actions in mutations |

---

## Build Verification

No test suite. Use `npm run build` as the gate:
```bash
npm run build 2>&1 | tail -5
```
Expected pass: last lines are route table with `○` / `ƒ` markers, no red error lines.

---

## Task 1: SQL migrations — run in Supabase dashboard

**Files:** None (SQL run externally in Supabase SQL editor)

This task has no code commits. You run SQL in the Supabase dashboard, then verify.

- [ ] **Step 1: Open the Supabase SQL editor**

Go to: Supabase dashboard → your project → SQL Editor → New Query

- [ ] **Step 2: Create the `projects` table**

Paste and run:

```sql
create table if not exists projects (
  id            text        primary key,
  org_id        text        not null,
  name          text        not null,
  slug          text        not null,
  status        text        not null default 'planning',
  phase         text        not null default '',
  location      text        not null default '',
  pm_name       text        not null default '',
  progress_pct  integer     not null default 0,
  open_issues   integer     not null default 0,
  last_activity text        not null default '',
  start_date    text        not null default '',
  end_date      text        not null default '',
  description   text,
  award_price   numeric,
  created_at    timestamptz not null default now()
);

create index if not exists projects_org_id_idx on projects(org_id);
```

Expected: "Success. No rows returned."

- [ ] **Step 3: Create the `crews` and `crew_members` tables**

Paste and run:

```sql
create table if not exists crews (
  id         text        primary key,
  org_id     text        not null,
  project_id text        not null,
  name       text        not null,
  lead_name  text,
  status     text        default 'on_site',
  created_at timestamptz not null default now()
);

create index if not exists crews_org_id_idx on crews(org_id);

create table if not exists crew_members (
  crew_id   text not null references crews(id) on delete cascade,
  worker_id text not null,
  primary key (crew_id, worker_id)
);
```

Expected: "Success. No rows returned."

- [ ] **Step 4: Verify tables exist**

Run:
```sql
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Expected: `crew_members`, `crews`, `projects`, `workers` all appear in the list.

---

## Task 2: Fetch functions — `projects` and `crews`

**Files:**
- Create: `src/lib/supabase/projects.ts`
- Create: `src/lib/supabase/crews.ts`

- [ ] **Step 1: Create `src/lib/supabase/projects.ts`**

```ts
import "server-only";
import { supabase } from "./client";
import type { Project, ProjectStatus } from "@/types/domain";

export async function fetchOrgProjects(orgId: string): Promise<Project[]> {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("id, org_id, name, slug, status, phase, location, pm_name, progress_pct, open_issues, last_activity, start_date, end_date, description, award_price")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id:            row.id,
      name:          row.name,
      slug:          row.slug,
      status:        row.status as ProjectStatus,
      phase:         row.phase,
      location:      row.location,
      pm_name:       row.pm_name,
      progress_pct:  row.progress_pct,
      open_issues:   row.open_issues,
      last_activity: row.last_activity,
      start_date:    row.start_date,
      end_date:      row.end_date,
      description:   row.description ?? undefined,
      award_price:   row.award_price != null ? Number(row.award_price) : undefined,
    }));
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Create `src/lib/supabase/crews.ts`**

```ts
import "server-only";
import { supabase } from "./client";
import type { OrgCrew, CrewStatus } from "@/types/domain";

export async function fetchOrgCrews(orgId: string): Promise<OrgCrew[]> {
  try {
    const [{ data: crewData, error }, { data: memberData }] = await Promise.all([
      supabase
        .from("crews")
        .select("id, org_id, project_id, name, lead_name, status")
        .eq("org_id", orgId),
      supabase
        .from("crew_members")
        .select("crew_id, worker_id"),
    ]);

    if (error || !crewData) return [];

    const membersByCrewId: Record<string, string[]> = {};
    for (const m of memberData ?? []) {
      if (!membersByCrewId[m.crew_id]) membersByCrewId[m.crew_id] = [];
      membersByCrewId[m.crew_id].push(m.worker_id);
    }

    return crewData.map((row) => ({
      id:        row.id,
      orgId:     row.org_id,
      projectId: row.project_id,
      name:      row.name,
      memberIds: membersByCrewId[row.id] ?? [],
      leadName:  row.lead_name ?? undefined,
      status:    (row.status as CrewStatus) ?? undefined,
    }));
  } catch {
    return [];
  }
}
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/projects.ts src/lib/supabase/crews.ts
git commit -m "feat(supabase): add fetchOrgProjects and fetchOrgCrews"
```

---

## Task 3: Server Actions — project and crew writes

**Files:**
- Create: `src/lib/actions/projects.ts`
- Create: `src/lib/actions/crews.ts`

Server Actions use `"use server"` directive and can import `server-only` modules. They will be called from `OrgProvider` (a client component) — this is valid in Next.js 15.

- [ ] **Step 1: Create `src/lib/actions/projects.ts`**

```ts
"use server";
import { supabase } from "@/lib/supabase/client";
import type { Project } from "@/types/domain";
import type { UpdateProjectInput } from "@/types/domain";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export async function serverCreateProject(project: Project): Promise<void> {
  await supabase.from("projects").insert({
    id:            project.id,
    org_id:        ORG_ID,
    name:          project.name,
    slug:          project.slug,
    status:        project.status,
    phase:         project.phase,
    location:      project.location,
    pm_name:       project.pm_name,
    progress_pct:  project.progress_pct,
    open_issues:   project.open_issues,
    last_activity: project.last_activity,
    start_date:    project.start_date,
    end_date:      project.end_date,
    description:   project.description ?? null,
    award_price:   project.award_price ?? null,
  });
}

export async function serverUpdateProject(
  id: string,
  patch: UpdateProjectInput,
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.name        !== undefined) update.name        = patch.name;
  if (patch.location    !== undefined) update.location    = patch.location;
  if (patch.phase       !== undefined) update.phase       = patch.phase;
  if (patch.pm_name     !== undefined) update.pm_name     = patch.pm_name;
  if (patch.status      !== undefined) update.status      = patch.status;
  if (patch.start_date  !== undefined) update.start_date  = patch.start_date;
  if (patch.end_date    !== undefined) update.end_date    = patch.end_date;
  if (patch.description !== undefined) update.description = patch.description ?? null;
  if (patch.award_price !== undefined) update.award_price = patch.award_price ?? null;
  if (Object.keys(update).length === 0) return;
  await supabase.from("projects").update(update).eq("id", id);
}
```

- [ ] **Step 2: Create `src/lib/actions/crews.ts`**

```ts
"use server";
import { supabase } from "@/lib/supabase/client";
import type { OrgCrew } from "@/types/domain";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export async function serverCreateCrew(crew: OrgCrew): Promise<void> {
  await supabase.from("crews").insert({
    id:         crew.id,
    org_id:     ORG_ID,
    project_id: crew.projectId,
    name:       crew.name,
    lead_name:  crew.leadName ?? null,
    status:     crew.status ?? "on_site",
  });
}

export async function serverAddCrewMember(
  crewId: string,
  workerId: string,
): Promise<void> {
  await supabase
    .from("crew_members")
    .upsert({ crew_id: crewId, worker_id: workerId });
}

export async function serverRemoveCrewMember(
  crewId: string,
  workerId: string,
): Promise<void> {
  await supabase
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId)
    .eq("worker_id", workerId);
}
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/projects.ts src/lib/actions/crews.ts
git commit -m "feat(supabase): add Server Actions for project and crew writes"
```

---

## Task 4: Wire reads — shell layout, shell-client, OrgProvider initial props

**Files:**
- Modify: `src/app/(shell)/layout.tsx`
- Modify: `src/app/(shell)/shell-client.tsx`
- Modify: `src/providers/OrgProvider.tsx`

### Part A — Shell layout

- [ ] **Step 1: Update `src/app/(shell)/layout.tsx`**

Current file:
```ts
import { fetchOrgWorkers } from "@/lib/supabase/workers";
import { ShellClientRoot } from "./shell-client";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export default async function ShellRootLayout({ children }: { children: React.ReactNode }) {
  const workers = await fetchOrgWorkers(ORG_ID);
  return (
    <ShellClientRoot initialWorkers={workers}>
      {children}
    </ShellClientRoot>
  );
}
```

Replace with:
```ts
import { fetchOrgWorkers }  from "@/lib/supabase/workers";
import { fetchOrgProjects } from "@/lib/supabase/projects";
import { fetchOrgCrews }    from "@/lib/supabase/crews";
import { ShellClientRoot }  from "./shell-client";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export default async function ShellRootLayout({ children }: { children: React.ReactNode }) {
  const [workers, projects, crews] = await Promise.all([
    fetchOrgWorkers(ORG_ID),
    fetchOrgProjects(ORG_ID),
    fetchOrgCrews(ORG_ID),
  ]);
  return (
    <ShellClientRoot initialWorkers={workers} initialProjects={projects} initialCrews={crews}>
      {children}
    </ShellClientRoot>
  );
}
```

### Part B — Shell client

- [ ] **Step 2: Update `src/app/(shell)/shell-client.tsx`**

Find the `ShellClientRoot` props interface and function signature. Currently:
```ts
import type { OrgWorker } from "@/types/domain";

export function ShellClientRoot({
  children,
  initialWorkers,
}: {
  children:       React.ReactNode;
  initialWorkers: OrgWorker[];
}) {
```

Replace with:
```ts
import type { OrgWorker, Project, OrgCrew } from "@/types/domain";

export function ShellClientRoot({
  children,
  initialWorkers,
  initialProjects,
  initialCrews,
}: {
  children:        React.ReactNode;
  initialWorkers:  OrgWorker[];
  initialProjects: Project[];
  initialCrews:    OrgCrew[];
}) {
```

Then find the `<OrgProvider initialWorkers={initialWorkers}>` line and replace:
```tsx
      <OrgProvider initialWorkers={initialWorkers} initialProjects={initialProjects} initialCrews={initialCrews}>
```

### Part C — OrgProvider initial props

- [ ] **Step 3: Add `initialProjects` and `initialCrews` to OrgProvider function signature**

Find:
```ts
export function OrgProvider({
  children,
  initialWorkers = [],
}: {
  children:        React.ReactNode;
  initialWorkers?: OrgWorker[];
}) {
```

Replace with:
```ts
export function OrgProvider({
  children,
  initialWorkers  = [],
  initialProjects,
  initialCrews,
}: {
  children:         React.ReactNode;
  initialWorkers?:  OrgWorker[];
  initialProjects?: Project[];
  initialCrews?:    OrgCrew[];
}) {
```

- [ ] **Step 4: Change `projects` and `crews` state to use initial props**

Find:
```ts
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
```
Replace with:
```ts
  const [projects, setProjects] = useState<Project[]>(
    initialProjects ?? MOCK_PROJECTS,
  );
```

Find:
```ts
  const [crews,    setCrews]    = useState<OrgCrew[]>(seedCrews(orgId));
```
Replace with:
```ts
  const [crews, setCrews] = useState<OrgCrew[]>(
    initialCrews ?? seedCrews(orgId),
  );
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: clean build.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(shell\)/layout.tsx src/app/\(shell\)/shell-client.tsx src/providers/OrgProvider.tsx
git commit -m "feat(supabase): wire initialProjects and initialCrews from Supabase into OrgProvider"
```

---

## Task 5: Wire writes — OrgProvider mutation calls to Server Actions

**Files:**
- Modify: `src/providers/OrgProvider.tsx`

Add Server Action calls alongside each in-memory mutation. The pattern is optimistic: update local state first (instant UI), persist to Supabase in the background (fire and forget with `.catch(console.error)` for Phase 2).

- [ ] **Step 1: Add Server Action imports to OrgProvider**

At the top of `src/providers/OrgProvider.tsx`, after the existing imports, add:
```ts
import { serverCreateProject, serverUpdateProject } from "@/lib/actions/projects";
import { serverCreateCrew, serverAddCrewMember, serverRemoveCrewMember } from "@/lib/actions/crews";
```

- [ ] **Step 2: Add persistence to `addProject`**

Find the `addProject` function. After `setProjects((prev) => [project, ...prev]);`, add:
```ts
    serverCreateProject(project).catch(console.error);
```

The full function after the change:
```ts
  function addProject(input: CreateProjectInput): Project {
    const project: Project = {
      id:            crypto.randomUUID(),
      name:          input.name,
      slug:          slugify(input.name),
      status:        "planning",
      phase:         input.phase,
      location:      input.location,
      pm_name:       input.pmName,
      progress_pct:  0,
      open_issues:   0,
      last_activity: new Date().toISOString(),
      start_date:    input.startDate,
      end_date:      input.endDate,
      description:   input.description,
      award_price:   input.awardPrice,
    };
    setProjects((prev) => [project, ...prev]);
    serverCreateProject(project).catch(console.error);
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  config.currentUser.name,
      action:      "created project",
      entity_type: "project",
      entity_name: project.name,
      project_id:  project.id,
      module:      "shell",
      timestamp:   new Date().toISOString(),
    });
    return project;
  }
```

- [ ] **Step 3: Add persistence to `updateProject`**

Find the `updateProject` function. After `setProjects((prev) => prev.map(...))`, add:
```ts
    serverUpdateProject(id, patch).catch(console.error);
```

The full function after the change:
```ts
  function updateProject(id: string, patch: UpdateProjectInput): void {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated: Project = { ...p, ...patch };
        if (patch.name) updated.slug = slugify(patch.name);
        return updated;
      }),
    );
    serverUpdateProject(id, patch).catch(console.error);
  }
```

- [ ] **Step 4: Add persistence to `addCrew`**

Find the `addCrew` function. After `setCrews((prev) => [crew, ...prev]);`, add:
```ts
    serverCreateCrew(crew).catch(console.error);
```

- [ ] **Step 5: Add persistence to `addWorkerToCrew`**

Find the `addWorkerToCrew` function. It currently does:
```ts
  function addWorkerToCrew(crewId: string, workerId: string) {
    setCrews((prev) =>
      prev.map((c) =>
        c.id === crewId
          ? { ...c, memberIds: [...c.memberIds, workerId] }
          : c,
      ),
    );
  }
```

Add the Server Action call:
```ts
  function addWorkerToCrew(crewId: string, workerId: string) {
    setCrews((prev) =>
      prev.map((c) =>
        c.id === crewId
          ? { ...c, memberIds: [...c.memberIds, workerId] }
          : c,
      ),
    );
    serverAddCrewMember(crewId, workerId).catch(console.error);
  }
```

- [ ] **Step 6: Add persistence to `removeWorkerFromCrew`**

Find the `removeWorkerFromCrew` function and add:
```ts
    serverRemoveCrewMember(crewId, workerId).catch(console.error);
```

- [ ] **Step 7: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add src/providers/OrgProvider.tsx
git commit -m "feat(supabase): persist project and crew mutations to Supabase"
```

---

## Self-Review

### Spec coverage
- [x] `projects` table created — Task 1
- [x] `crews` + `crew_members` tables created — Task 1
- [x] `fetchOrgProjects` — Task 2
- [x] `fetchOrgCrews` (with crew_members join) — Task 2
- [x] `serverCreateProject` / `serverUpdateProject` — Task 3
- [x] `serverCreateCrew` / `serverAddCrewMember` / `serverRemoveCrewMember` — Task 3
- [x] Shell layout fetches projects + crews in parallel — Task 4
- [x] OrgProvider seeds from initialProjects / initialCrews (with mock fallback) — Task 4
- [x] `addProject` persists to Supabase — Task 5
- [x] `updateProject` persists to Supabase — Task 5
- [x] `addCrew` persists to Supabase — Task 5
- [x] `addWorkerToCrew` / `removeWorkerFromCrew` persist to Supabase — Task 5

### Placeholder scan
None found.

### Type consistency
- `Project` type used identically across fetch, actions, and OrgProvider state
- `OrgCrew` type used identically across fetch, actions, and OrgProvider state
- `UpdateProjectInput` is `Partial<Pick<Project, ...>>` — `serverUpdateProject` patch parameter matches exactly
- `serverAddCrewMember(crewId, workerId)` called with `(string, string)` — matches action signature

### Notes for executor
- Task 1 (SQL) must be done **before** Tasks 2-5 — tables must exist before you deploy code that queries them
- The mock fallback in OrgProvider (`?? MOCK_PROJECTS`, `?? seedCrews(orgId)`) means the app continues to work even when Supabase tables are empty — projects created before migrations will just not appear until re-created
- `NEXT_PUBLIC_CRU_ORG_ID` is used as the org_id filter in both reads and writes — ensure it's set in `.env.local`; if it's not set, the default `"org_aiga_001"` string is used as both filter and insert value, which is consistent and will work for a single-org Phase 2 build
