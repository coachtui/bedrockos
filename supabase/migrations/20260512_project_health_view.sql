-- Synthesis view: canonical read surface for projects.
-- Combines static fields from `projects` with derived health metrics
-- (progress_pct, open_issues, last_activity) computed from cx_tasks,
-- issues, and activity. Replaces direct reads from `projects` so stored
-- counter columns can be dropped in a follow-up migration.
--
-- Stored columns now superseded:
--   projects.progress_pct, projects.open_issues, projects.last_activity

drop view if exists project_health;

create view project_health as
select
  p.id,
  p.org_id,
  p.name,
  p.slug,
  p.status,
  p.phase,
  p.location,
  p.pm_name,
  p.start_date,
  p.end_date,
  p.description,
  p.award_price,
  p.working_holiday_dates,
  p.created_at,
  coalesce(
    round(100.0 * count(*) filter (where t.status = 'complete') / nullif(count(t.id), 0))::int,
    0
  ) as progress_pct,
  (select count(*)::int from issues i
    where i.project_id = p.id and i.status <> 'resolved') as open_issues,
  coalesce(
    (select max(a.timestamp)::text from activity a where a.project_id = p.id),
    ''
  ) as last_activity
from projects p
left join cx_tasks t on t.project_id = p.id and t.org_id = p.org_id
group by p.id;
