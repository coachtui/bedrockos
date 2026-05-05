create table if not exists assets (
  id         text primary key,
  org_id     text not null,
  name       text not null,
  type       text not null default '',
  status     text not null default 'active',
  project_id text not null,
  last_seen  text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assets_org_id_idx on assets (org_id);
create index if not exists assets_org_project_idx on assets (org_id, project_id);
create index if not exists assets_org_status_idx on assets (org_id, status);

alter table assets add column if not exists org_id     text not null default '';
alter table assets add column if not exists name       text not null default '';
alter table assets add column if not exists type       text not null default '';
alter table assets add column if not exists status     text not null default 'active';
alter table assets add column if not exists project_id text not null default '';
alter table assets add column if not exists last_seen  text not null default '';
alter table assets add column if not exists created_at timestamptz not null default now();
alter table assets add column if not exists updated_at timestamptz not null default now();
