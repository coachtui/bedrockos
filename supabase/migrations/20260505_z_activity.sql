create table if not exists activity (
  id            text primary key,
  org_id        text not null references organizations (id) on delete cascade,
  actor_name    text not null,
  action        text not null,
  entity_type   text not null,
  entity_id     text,
  entity_name   text not null,
  project_id    text not null references projects (id) on delete cascade,
  module        text not null check (module in ('cru','fix','inspect','datum','ops','mx','schedule','shell')),
  "timestamp"   timestamptz not null default now(),
  target_type   text check (target_type in ('issue','alert','asset','project')),
  target_id     text
);

create index if not exists activity_org_ts_idx     on activity (org_id, "timestamp" desc);
create index if not exists activity_org_module_idx on activity (org_id, module);
create index if not exists activity_project_idx    on activity (project_id);

alter table activity enable row level security;

create policy "members can read activity in their org"
  on activity for select
  to authenticated
  using (
    exists (
      select 1 from org_users
      where org_users.org_id = activity.org_id
        and org_users.auth_id = auth.uid()
    )
  );

create policy "members can insert activity in their org"
  on activity for insert
  to authenticated
  with check (
    exists (
      select 1 from org_users
      where org_users.org_id = activity.org_id
        and org_users.auth_id = auth.uid()
    )
  );
