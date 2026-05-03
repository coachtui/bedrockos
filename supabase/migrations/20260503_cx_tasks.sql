create table cx_tasks (
  id                   text        primary key,
  org_id               text        not null,
  project_id           text        not null,
  name                 text        not null,
  type                 text        not null,
  start_date           date,
  end_date             date,
  location             text,
  status               text        not null default 'not_started',
  crew_requirements    jsonb       not null default '[]'::jsonb,
  assigned_worker_ids  text[]      not null default '{}',
  notes                text,
  external_id          text,
  created_at           timestamptz not null default now()
);

create index cx_tasks_org_id_idx on cx_tasks(org_id);
create index cx_tasks_org_project_idx on cx_tasks(org_id, project_id);
