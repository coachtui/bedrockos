create table if not exists issues (
  id             text primary key,
  org_id         text not null references organizations (id) on delete cascade,
  title          text not null,
  module         text not null check (module in ('cru','fix','inspect','datum','ops','mx','schedule')),
  severity       text not null check (severity in ('critical','high','medium','low')),
  project_id     text not null references projects (id) on delete cascade,
  project_name   text,
  created_at     timestamptz not null default now(),
  assignee_name  text,
  status         text not null default 'open' check (status in ('open','in_progress','resolved')),
  asset_id       text references assets (id) on delete set null,
  asset_name     text,
  inspection_id  text,
  description    text
);

create index if not exists issues_org_status_idx on issues (org_id, status);
create index if not exists issues_org_module_idx on issues (org_id, module);
create index if not exists issues_project_idx     on issues (project_id);

alter table issues enable row level security;

create policy "members can read issues in their org"
  on issues for select
  to authenticated
  using (
    exists (
      select 1 from org_users
      where org_users.org_id = issues.org_id
        and org_users.auth_id = auth.uid()
    )
  );

create policy "members can insert issues in their org"
  on issues for insert
  to authenticated
  with check (
    exists (
      select 1 from org_users
      where org_users.org_id = issues.org_id
        and org_users.auth_id = auth.uid()
    )
  );

create policy "members can update issues in their org"
  on issues for update
  to authenticated
  using (
    exists (
      select 1 from org_users
      where org_users.org_id = issues.org_id
        and org_users.auth_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.org_id = issues.org_id
        and org_users.auth_id = auth.uid()
    )
  );
