create table if not exists alerts (
  id                text primary key,
  org_id            text not null references organizations (id) on delete cascade,
  type              text not null check (type in ('safety','schedule','equipment','budget','inspection')),
  severity          text not null check (severity in ('critical','warning','info')),
  message           text not null,
  project_id        text not null references projects (id) on delete cascade,
  project_name      text,
  created_at        timestamptz not null default now(),
  is_read           boolean not null default false,
  description       text,
  related_issue_id  text references issues (id) on delete set null
);

create index if not exists alerts_org_isread_idx on alerts (org_id, is_read);
create index if not exists alerts_org_type_idx   on alerts (org_id, type);
create index if not exists alerts_project_idx    on alerts (project_id);

alter table alerts enable row level security;

create policy "members can read alerts in their org"
  on alerts for select
  to authenticated
  using (
    exists (
      select 1 from org_users
      where org_users.org_id = alerts.org_id
        and org_users.auth_id = auth.uid()
    )
  );

create policy "members can insert alerts in their org"
  on alerts for insert
  to authenticated
  with check (
    exists (
      select 1 from org_users
      where org_users.org_id = alerts.org_id
        and org_users.auth_id = auth.uid()
    )
  );

create policy "members can update alerts in their org"
  on alerts for update
  to authenticated
  using (
    exists (
      select 1 from org_users
      where org_users.org_id = alerts.org_id
        and org_users.auth_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.org_id = alerts.org_id
        and org_users.auth_id = auth.uid()
    )
  );
