-- cx_tasks: rename title → name
alter table cx_tasks rename column title to name;

-- cx_tasks: drop stale columns
alter table cx_tasks drop column if exists priority;
alter table cx_tasks drop column if exists due_date;

-- cx_tasks: add missing columns
alter table cx_tasks
  add column if not exists end_date             date,
  add column if not exists location             text,
  add column if not exists crew_requirements    jsonb    not null default '[]'::jsonb,
  add column if not exists assigned_worker_ids  text[]   not null default '{}',
  add column if not exists original_duration    integer,
  add column if not exists remaining_duration   integer,
  add column if not exists predecessors         text[]   not null default '{}',
  add column if not exists successors           text[]   not null default '{}';

-- cx_tasks: fix project_id nullability
alter table cx_tasks alter column project_id set not null;

-- crews: add missing lead_name column
alter table crews add column if not exists lead_name text;
