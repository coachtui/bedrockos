create table cx_day_assignments (
  id          text        primary key,
  org_id      text        not null,
  worker_id   text        not null,
  project_id  text        not null,
  date        date        not null,
  created_at  timestamptz not null default now(),
  unique (org_id, worker_id, date)
);

create index cx_day_assignments_org_id_idx on cx_day_assignments(org_id);
