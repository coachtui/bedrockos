# CX Module — Spec

CX is the crew resource and utilization module. It is the workforce source of truth for the platform — OX and MX read from it, never write to it.

**Module identity:** id `cru`, label `CX`, accent color `gold`, route `/modules/cru`

---

## Core Concept

CX is scoped to the selected project (job site). Everything — roster, assignments, schedule, equipment — reflects the current project via `useOrg()` context. Switching projects re-scopes all views instantly.

The module is **mobile-forward**. Field users (foremen, superintendents, masons) are the primary audience. Every view must work well on a phone.

---

## Who Uses CX

| Role | Access |
|---|---|
| Project Engineer | Creates initial site schedule, manages site tasks |
| Superintendent | Modifies schedule, manages roster and assignments |
| Foreman | Read-only "Today" view — today's tasks and assigned workers only |
| Org Admin / PM | Cross-project worker assignments (floating/lending) |

---

## Navigation Structure

```
/modules/cru                → Roster (default)
/modules/cru/assignments    → Weekly assignments
/modules/cru/schedule       → 4-week site schedule
/modules/cru/equipment      → Site equipment (read-only)
```

---

## Sub-Views

### 1. Roster

The live workforce for the selected project.

- Lists all workers **assigned to this project** — both primary and borrowed (temp-assigned from other projects)
- Borrowed workers are visually distinguished (e.g. badge showing source project)
- Group/filter by role: mason, driver, mechanic, laborer, foreman, superintendent
- Search by name
- Each worker card shows: name, role, availability, site assignment
- Mobile: single-column card list

**Data source:** `OrgProvider` workers filtered to current project, supplemented by temp assignments from other projects.

---

### 2. Assignments

Weekly schedule showing where each worker is this week, across projects.

- Organized by worker, showing project assignment per day Mon–Sun
- Masons and other shared-pool workers will show multi-site distribution across the week
- **Who creates assignments:** Org-level manager/admin assigns workers to projects by day. Superintendents can view but not create cross-project assignments.
- Highlights conflicts (same worker double-assigned on same day)
- Mobile: scrollable weekly grid, worker rows

**Cross-project floating note:** Masons especially are shared resources across all sites. A mason may be at Site A Mon, Site B Tue–Wed, Site A Thu–Fri. The assignment view makes this legible to all project stakeholders.

---

### 3. Site Schedule

The project's 4-week operational calendar. **Current week + 3 weeks out.**

> This is NOT the global pour schedule (which lives in OX and shows org-wide pump truck and mason team commitments). The site schedule is specific to one project.

**Calendar view** — monthly/4-week grid of site events. Events include:
- Concrete pour
- Inspection
- Delivery
- Grading / Earthwork
- Milestone
- Other

**Gantt view** — weekly timeline showing site tasks plotted as bars. Each day shows **staffing status**:
- Understaffed — task requirements exceed assigned workers
- Staffed — requirements met
- Overstaffed — more workers assigned than tasks require

Clicking an event or task opens the **site task inspector panel** (right-side slide-over).

**Access:** Engineer creates the initial schedule. Superintendent can modify.

#### Integration: Pour scheduling + OX global data

When a superintendent or engineer adds a pour event to the site schedule, CX surfaces pump truck and mason availability from the OX global pour schedule inline — showing which trucks and how many masons are already committed on that date across the org. This is read-only context; CX does not write to the OX schedule.

---

### 4. Equipment

Read-only view of equipment/assets assigned to this project.

- Pulls from shell `assets` (via `OrgProvider`) filtered by `project_id === currentProject.id`
- Shows: name, type, status (`active / maintenance / offline`), last seen
- Filter by type and status
- CX does not own, create, or edit assets — that is the shell's responsibility
- Equipment requests (e.g. requesting a pump truck from the company pool) go through OX

---

### 5. Foreman "Today" View (Role-Gated)

Shown when the logged-in user's role is `foreman`.

- Replaces the default Roster view
- Shows only today's tasks for this project
- For each task: task name, location, workers assigned
- No edit capability — read-only field reference
- Optimized for mobile: large text, minimal chrome

---

## Site Tasks

Site tasks represent work happening on the project. They live on the site schedule and drive the staffing status calculation.

### Fields

| Field | Type | Required |
|---|---|---|
| Name | Text | Yes |
| Type | Select: Pour / Inspection / Delivery / Grading / Concrete / Framing / Electrical / Other | Yes |
| Start date | Date | Yes |
| End date | Date | Yes |
| Location | Text (free-form: "Grid B-4", "2nd floor east wing") | No |
| Status | Select: Not Started / In Progress / On Hold / Complete | Yes (default: Not Started) |
| Crew requirements | Role + count pairs (e.g. 2 laborers, 1 mason, 1 operator) | No |
| Assigned workers | Multi-select from project roster | No |
| Notes | Textarea | No |

**Crew requirements** drive staffing status. If a task requires 2 masons and only 1 is assigned, that day shows as understaffed on the Gantt.

### Inspector Panel (slide-over)

Creating or editing a task opens a right-side inspector panel — same pattern as MX work orders and shell assets. Panel contains all fields above. Accessible from the schedule calendar, the Gantt, and the Foreman Today view.

---

## Integration Points

| System | Direction | What CX consumes |
|---|---|---|
| Shell `OrgProvider` | Read | Workers, assets (filtered by project) |
| OX global pour schedule | Read | Pump truck + mason team availability by date (for pour scheduling) |
| MX | Read | Mechanics come from CRU worker pool (already implemented) |

CX is always the consumer. It does not write to OX, MX, or the shell.

---

## Staffing Status Logic

For each day on the Gantt:

1. Sum all crew requirements across tasks active on that day
2. Sum all workers assigned to tasks on that day (from the project roster, including borrowed workers)
3. Compare per role: if any required role has fewer assigned than required → **understaffed**; if all met → **staffed**; if excess → **overstaffed**

Status is shown as a color indicator on the day column header in the Gantt view.

---

## Out of Scope (Phase 1)

- Daily hours / time tracking
- Print roster
- Shared files (will live in shell)
- CSV bulk import
- Real-time live updates (Supabase Realtime — deferred to backend integration phase)
- Billing
