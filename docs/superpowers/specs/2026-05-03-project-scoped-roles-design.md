# Project-Scoped Roles Design

## Problem

Workers have a permanent trade classification (operator, mason, laborer) but are sometimes assigned leadership positions (foreman, superintendent) on a specific project. That position should grant project-scoped platform access — they can only see and act within the project(s) they're leading. On projects where they hold no position, they have no access at all.

The existing `UserRole` system is org-level and cannot express this distinction.

---

## Data Model

### Unchanged: `workers.role` = trade classification

The `role` column on the `workers` table remains the worker's permanent trade (operator, mason, laborer, carpenter, driver, mechanic). This never changes when someone is assigned a leadership position.

### New: `worker_project_roles` table

Stores project-scoped leadership assignments. One row per assignment.

```sql
create table worker_project_roles (
  id          text primary key default gen_random_uuid()::text,
  org_id      text not null,
  worker_id   text not null references workers(id) on delete cascade,
  project_id  text not null references projects(id) on delete cascade,
  position    text not null check (position in ('superintendent', 'foreman')),
  created_at  timestamptz not null default now(),
  unique(worker_id, project_id)
);

create index worker_project_roles_worker_idx on worker_project_roles (worker_id);
create index worker_project_roles_project_idx on worker_project_roles (org_id, project_id);
```

**A worker with no row for a project has no access to that project.** A worker with a row sees only that project at the access level of their position.

---

## Access Control

Platform `UserRole` for foremen and superintendents is **derived at runtime** from their `worker_project_roles` row for the active project — not stored as a static org-level role.

| Position | Access |
|---|---|
| `superintendent` | Full project visibility: crew, tasks, schedule, assignments, issues, reports |
| `foreman` | Scoped to their crew: workers, daily assignments, tasks, field issues. No cross-crew or org-level views. |
| (no row) | No access. Project does not appear in their project picker. |

`owner`, `admin`, and `pm` roles are org-level and unaffected by this system.

### Project picker on login

When a foreman/superintendent logs in, BedrockOS queries `worker_project_roles` for all their rows. If one project → they land there directly. If multiple → they choose from a list of their assigned projects. No org-wide dashboard is shown.

---

## Admin Workflow

1. Admin opens a project → navigates to a "Leadership" or "Project Roles" section
2. Picks a worker from the org roster (already in `workers` table by trade)
3. Assigns them a position: Foreman or Superintendent → inserts a row in `worker_project_roles`
4. If the worker has no platform login yet → admin triggers an invite that links to the worker's `userId` field
5. Worker logs in → sees only their assigned project(s) at their position's access level

To remove access: admin deletes the row. Worker record and trade classification are untouched.

---

## Key Invariants

- `workers.role` = trade, permanent. Never overwritten by a position assignment.
- Position assignments live in `worker_project_roles`, not on the workers row.
- A worker can be foreman on Project A and have zero access on Project B simultaneously.
- Access level is always derived from the active project's position row — never from a static org role.
- Only `superintendent` and `foreman` are valid positions. PM and above remain org-level roles.

---

## Out of Scope

- Foreman → Superintendent promotion workflows
- Workers seeing their own schedule without a leadership position
- Multi-project dashboard views for field roles
