create table if not exists organizations (
  id              text primary key,
  name            text not null,
  slug            text not null unique,
  status          text not null default 'trial' check (status in ('active','trial','internal','inactive')),
  enabled_modules text[] not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists organizations_slug_idx on organizations (slug);

insert into organizations (id, name, slug, status, enabled_modules)
values ('550e8400-e29b-41d4-a716-446655440000', 'AIGA', 'aiga', 'internal', '{}')
on conflict (id) do nothing;

alter table org_users
  add constraint org_users_org_id_fkey
  foreign key (org_id) references organizations (id) on delete cascade;

alter table projects
  add constraint projects_org_id_fkey
  foreign key (org_id) references organizations (id) on delete cascade;

alter table workers
  add constraint workers_org_id_fkey
  foreign key (org_id) references organizations (id) on delete cascade;

alter table crews
  add constraint crews_org_id_fkey
  foreign key (org_id) references organizations (id) on delete cascade;

alter table cx_tasks
  add constraint cx_tasks_org_id_fkey
  foreign key (org_id) references organizations (id) on delete cascade;

alter table cx_day_assignments
  add constraint cx_day_assignments_org_id_fkey
  foreign key (org_id) references organizations (id) on delete cascade;

alter table worker_project_roles
  add constraint worker_project_roles_org_id_fkey
  foreign key (org_id) references organizations (id) on delete cascade;

alter table project_files
  add constraint project_files_org_id_fkey
  foreign key (org_id) references organizations (id) on delete cascade;

alter table assets
  add constraint assets_org_id_fkey
  foreign key (org_id) references organizations (id) on delete cascade;

alter table organizations enable row level security;

create policy "members can read their org"
  on organizations for select
  to authenticated
  using (
    exists (
      select 1 from org_users
      where org_users.org_id = organizations.id
        and org_users.auth_id = auth.uid()
    )
  );
