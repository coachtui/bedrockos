create table if not exists ops_requests (
  id                       text        primary key,
  org_id                   text        not null references organizations (id) on delete cascade,
  type                     text        not null check (type in ('mason','pump_truck','equipment','manpower')),
  trade                    text        check (trade in ('laborer','operator','mason','carpenter','ironworker','finisher','foreman')),
  equipment_type           text,
  quantity                 integer,
  jobsite                  text        not null,
  jobsite_id               text        references projects (id) on delete set null,
  date_needed              date        not null,
  notes                    text,
  status                   text        not null check (status in ('pending','approved','assigned','open','closed')),
  requested_by             text,
  requested_by_user_id     text,
  assigned_to              text,
  assigned_from            text,
  assigned_from_custom     text,
  assigned_at              timestamptz,
  assigned_by              text,
  assigned_to_id           text,
  assigned_to_label        text,
  assigned_to_role         text,
  requested_count          integer,
  source_pour_id           uuid        references ops_pours (id)        on delete set null,
  linked_mx_work_order_id  uuid        references mx_work_orders (id)   on delete set null,
  created_at               timestamptz not null default now()
);

create index if not exists ops_requests_org_status_idx  on ops_requests (org_id, status);
create index if not exists ops_requests_jobsite_idx     on ops_requests (jobsite_id);
create index if not exists ops_requests_source_pour_idx on ops_requests (source_pour_id);

alter table ops_requests enable row level security;

create policy "members can read requests in their org"
  on ops_requests for select to authenticated
  using (exists (select 1 from org_users
    where org_users.org_id = ops_requests.org_id and org_users.auth_id = auth.uid()));

create policy "members can insert requests in their org"
  on ops_requests for insert to authenticated
  with check (exists (select 1 from org_users
    where org_users.org_id = ops_requests.org_id and org_users.auth_id = auth.uid()));

create policy "members can update requests in their org"
  on ops_requests for update to authenticated
  using (exists (select 1 from org_users
    where org_users.org_id = ops_requests.org_id and org_users.auth_id = auth.uid()))
  with check (exists (select 1 from org_users
    where org_users.org_id = ops_requests.org_id and org_users.auth_id = auth.uid()));
