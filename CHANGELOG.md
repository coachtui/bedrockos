# Changelog

All notable changes to BedrockOS are documented here.

## [0.2.0.0] - 2026-05-06

### Added
- **Supabase persistence** — all data (workers, projects, assets, crews, issues, alerts, activity, cx-tasks, assignments, MX work orders, OPS pours/requests) now reads from and writes to Supabase. Mock data retained only as a graceful fallback when Supabase returns empty results.
- **Multi-tenant auth** — real Supabase session auth. Shell layout resolves the active org from the signed-in user's `org_users` record. Login, forgot-password, and accept-invite pages wired.
- **CRU scheduling** — cx_tasks and cx_day_assignments persisted to Supabase with optimistic mutations. 28-day scrollable Gantt with tabloid PDF export. Calendar view shows holidays, weekends grayed, and clicking a task chip opens the inspector panel.
- **GCA holiday system** — GCA 2026 holiday constants, `isNonWorkingDay` utility, and per-project holiday toggle overrides. Non-working days grayed in both Gantt and calendar views.
- **Project files** — upload, rename, sort, and open files attached to projects. Two-step direct-to-Supabase Storage upload with signed URLs. Visible in both the Command Center sidebar card and a dedicated `/projects/[id]/files` page.
- **Safety module** — new SX module page with initial safety scaffolding.
- **Inspect-lite flow** — engineers can file an issue directly from a task with photo attachments.
- **Platform admin** — `/platform` shell with org list, create/edit org forms, user management, and analytics/revenue stubs. Protected by `assertPlatformAdmin()`.
- **Worker project roles** — per-project position assignments for workers. Persisted to `worker_project_roles` table, threaded through shell layout.
- **OPS dispatch board** — rebuilt with open/closed request flow and source tracking.
- **BedrockGrid brand lockup** — SVG logo component replacing text placeholder.
- **SX sidebar entry** — Safety module added to navigation, gated by `enabledModules`.

### Changed
- CSV import redesigned for baseline schedule format.
- MX and OPS providers migrated off in-memory services to Supabase server actions.
- Activity, issues, and alerts now emit and persist cross-provider events.
- Middleware updated to include `/api/` routes in session handling (returns 401 JSON for unauthenticated API calls).
- All server actions now scope writes to `org_id` for multi-tenant isolation.

### Fixed
- Calendar view now starts on Sunday (Sun–Sat week layout).
- Gantt column widths uniform via CSS grid; bar gaps on non-working days.
- Crew requirements row layout — type select was being crushed by number input.
- Scheduled tasks not showing on calendar view (tasks with date ranges were only on Gantt).
- File upload bypassed Next.js middleware to upload directly to Supabase Storage.
- Migration file ordering corrected for FK dependency chain (organizations → issues → activity/alerts).

### Removed
- `src/lib/ops/service.ts` and `mock-data.ts` — superseded by Supabase actions.
- `/api/ops/requests` and `/api/ops/pour-schedule` legacy in-memory API routes — superseded by server actions.
