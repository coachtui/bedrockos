create table if not exists projects (
  id            text primary key,
  org_id        text not null,
  name          text not null,
  slug          text not null default '',
  status        text not null default 'active',
  phase         text not null default '',
  location      text not null default '',
  pm_name       text not null default '',
  progress_pct  integer not null default 0,
  open_issues   integer not null default 0,
  last_activity text not null default '',
  start_date    text not null default '',
  end_date      text not null default '',
  description   text,
  award_price   numeric,
  created_at    timestamptz not null default now()
);

create index if not exists projects_org_id_idx on projects (org_id);

-- If the table already exists but is missing columns, add them:
alter table projects add column if not exists slug          text not null default '';
alter table projects add column if not exists status        text not null default 'active';
alter table projects add column if not exists phase         text not null default '';
alter table projects add column if not exists location      text not null default '';
alter table projects add column if not exists pm_name       text not null default '';
alter table projects add column if not exists progress_pct  integer not null default 0;
alter table projects add column if not exists open_issues   integer not null default 0;
alter table projects add column if not exists last_activity text not null default '';
alter table projects add column if not exists start_date    text not null default '';
alter table projects add column if not exists end_date      text not null default '';
alter table projects add column if not exists description   text;
alter table projects add column if not exists award_price   numeric;
