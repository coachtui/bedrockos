-- Multi-project crew rollup. Boss-facing read surface for "who's where,
-- doing what, and how loaded." Flat list of every crew in the org with
-- project context, lead, headcount, role mix, status, and an active-task
-- proxy for utilization.
--
-- Columns:
--   crew_id, org_id, project_id, project_name
--   crew_name, lead_name, status
--   member_count   - distinct workers in crew_members
--   role_breakdown - jsonb { role: count } across crew members
--   active_tasks   - cx_tasks with status in (not_started, in_progress)
--                    whose assigned_worker_ids overlap the crew roster

drop view if exists crew_utilization;

create view crew_utilization as
select
  c.id                                                          as crew_id,
  c.org_id,
  c.project_id,
  p.name                                                        as project_name,
  c.name                                                        as crew_name,
  c.lead_name,
  c.status,
  (
    select count(*)::int
    from crew_members cm
    where cm.crew_id = c.id
  )                                                             as member_count,
  (
    select coalesce(jsonb_object_agg(role, cnt), '{}'::jsonb)
    from (
      select w.role, count(*)::int as cnt
      from crew_members cm
      join workers w on w.id = cm.worker_id
      where cm.crew_id = c.id
      group by w.role
    ) r
  )                                                             as role_breakdown,
  (
    select count(*)::int
    from cx_tasks t
    where t.org_id = c.org_id
      and t.status in ('not_started', 'in_progress')
      and t.assigned_worker_ids && (
        select coalesce(array_agg(cm.worker_id), '{}'::text[])
        from crew_members cm
        where cm.crew_id = c.id
      )
  )                                                             as active_tasks
from crews c
left join projects p on p.id = c.project_id and p.org_id = c.org_id;
