-- Drop the now-stale counter columns from projects.
-- These were superseded by computed fields in the project_health view
-- (20260512_project_health_view.sql). Keeping them invites future code
-- to write back to dead storage and quietly drift from reality.
--
-- App writes to these columns have been removed in the same change set
-- (src/lib/actions/projects.ts).

alter table projects drop column if exists progress_pct;
alter table projects drop column if exists open_issues;
alter table projects drop column if exists last_activity;
