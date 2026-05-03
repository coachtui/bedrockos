create table if not exists workers (
  id         text primary key,
  org_id     text not null,
  name       text not null,
  role       text not null default 'laborer',
  project_id text,
  site_name  text,
  available  boolean not null default true,
  skills     text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists workers_org_id_idx on workers (org_id);
create index if not exists workers_org_project_idx on workers (org_id, project_id);

-- If the table already exists but is missing columns, add them:
alter table workers add column if not exists project_id text;
alter table workers add column if not exists site_name  text;
alter table workers add column if not exists available  boolean not null default true;
alter table workers add column if not exists skills     text[] not null default '{}';
