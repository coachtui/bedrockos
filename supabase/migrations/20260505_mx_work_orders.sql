create sequence if not exists mx_work_orders_number_seq start 1;

create table if not exists mx_work_orders (
  id                    uuid        primary key default gen_random_uuid(),
  org_id                text        not null references organizations (id) on delete cascade,
  wo_number             text        not null,
  title                 text        not null,
  description           text,
  category              text        not null check (category in ('preventive','corrective','emergency','inspection','modification')),
  priority              text        not null check (priority in ('critical','high','medium','low')),
  status                text        not null default 'open' check (status in ('draft','open','triage','approved','scheduled','in_progress','waiting_parts','blocked','completed','canceled')),
  source_type           text        check (source_type in ('manual','inspection','alert')),
  source_id             text,
  equipment_id          text        references assets (id)   on delete set null,
  equipment_label       text,
  project_id            text        references projects (id) on delete set null,
  project_name          text,
  requested_by          text        not null,
  requested_by_user_id  text,
  requested_date        date        not null,
  needed_by_date        date,
  required_skills       text[]      not null default '{}',
  estimated_hours       numeric,
  scheduled_start       timestamptz,
  scheduled_end         timestamptz,
  actual_start          timestamptz,
  actual_end            timestamptz,
  readiness_impact      text        check (readiness_impact in ('ready','limited','at_risk','scheduled_service','in_shop','awaiting_parts','down')),
  ops_blocking          boolean     not null default false,
  assigned_mechanic_ids text[]      not null default '{}',
  completion_notes      text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create or replace function mx_work_orders_assign_wo_number()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.wo_number := 'WO-' || lpad(nextval('mx_work_orders_number_seq')::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists mx_work_orders_set_wo_number on mx_work_orders;
create trigger mx_work_orders_set_wo_number
  before insert on mx_work_orders
  for each row execute function mx_work_orders_assign_wo_number();

create or replace function mx_work_orders_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists mx_work_orders_touch on mx_work_orders;
create trigger mx_work_orders_touch
  before update on mx_work_orders
  for each row execute function mx_work_orders_touch_updated_at();

create index if not exists mx_work_orders_org_status_idx   on mx_work_orders (org_id, status);
create index if not exists mx_work_orders_org_priority_idx on mx_work_orders (org_id, priority);
create index if not exists mx_work_orders_equipment_idx    on mx_work_orders (equipment_id);
create index if not exists mx_work_orders_project_idx      on mx_work_orders (project_id);

alter table mx_work_orders enable row level security;

create policy "members can read mx work orders in their org"
  on mx_work_orders for select
  to authenticated
  using (
    exists (
      select 1 from org_users
      where org_users.org_id = mx_work_orders.org_id
        and org_users.auth_id = auth.uid()
    )
  );

create policy "members can insert mx work orders in their org"
  on mx_work_orders for insert
  to authenticated
  with check (
    exists (
      select 1 from org_users
      where org_users.org_id = mx_work_orders.org_id
        and org_users.auth_id = auth.uid()
    )
  );

create policy "members can update mx work orders in their org"
  on mx_work_orders for update
  to authenticated
  using (
    exists (
      select 1 from org_users
      where org_users.org_id = mx_work_orders.org_id
        and org_users.auth_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from org_users
      where org_users.org_id = mx_work_orders.org_id
        and org_users.auth_id = auth.uid()
    )
  );
