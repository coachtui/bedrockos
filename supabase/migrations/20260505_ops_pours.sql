create table if not exists ops_pours (
  id                     uuid        primary key default gen_random_uuid(),
  org_id                 text        not null references organizations (id) on delete cascade,
  jobsite_id             text        references projects (id) on delete set null,
  location               text        not null,
  date                   date        not null,
  "time"                 text        not null,
  pour_type              text        not null check (pour_type in ('Foundation','Slab','Column','Wall','Beam','Deck','Other')),
  yardage                numeric     not null,
  estimated_duration     text,
  notes                  text,
  pump_requested         boolean     not null default false,
  pump_type              text,
  pump_notes             text,
  mason_requested        boolean     not null default false,
  mason_count            integer,
  mason_notes            text,
  status                 text        not null default 'Draft' check (status in ('Draft','Pending Approval','Approved','Rejected','Canceled','In Progress','Completed')),
  created_by             text        not null,
  created_by_name        text        not null,
  requested_at           timestamptz not null default now(),
  approved_by            text,
  approved_by_name       text,
  approved_at            timestamptz,
  rejected_by            text,
  rejected_by_name       text,
  rejection_reason       text,
  canceled_by            text,
  canceled_by_name       text,
  canceled_at            timestamptz,
  cancellation_reason    text,
  related_work_order_ids text[]      not null default '{}',
  equipment_assignments  text[]      not null default '{}',
  conflicts              boolean
);

create index if not exists ops_pours_org_date_idx   on ops_pours (org_id, date);
create index if not exists ops_pours_org_status_idx on ops_pours (org_id, status);
create index if not exists ops_pours_jobsite_idx    on ops_pours (jobsite_id);

alter table ops_pours enable row level security;

create policy "members can read pours in their org"
  on ops_pours for select to authenticated
  using (exists (select 1 from org_users
    where org_users.org_id = ops_pours.org_id and org_users.auth_id = auth.uid()));

create policy "members can insert pours in their org"
  on ops_pours for insert to authenticated
  with check (exists (select 1 from org_users
    where org_users.org_id = ops_pours.org_id and org_users.auth_id = auth.uid()));

create policy "members can update pours in their org"
  on ops_pours for update to authenticated
  using (exists (select 1 from org_users
    where org_users.org_id = ops_pours.org_id and org_users.auth_id = auth.uid()))
  with check (exists (select 1 from org_users
    where org_users.org_id = ops_pours.org_id and org_users.auth_id = auth.uid()));
