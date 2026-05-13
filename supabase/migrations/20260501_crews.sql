-- Backfill: crews + crew_members were created via Supabase dashboard SQL
-- during the 2026-05-01 projects-and-crews plan execution, but the migration
-- file was never committed. This restores git as the source of truth.
-- Safe to re-run against the live database (uses `if not exists`).

create table if not exists crews (
  id         text        primary key,
  org_id     text        not null,
  project_id text        not null,
  name       text        not null,
  lead_name  text,
  status     text        default 'on_site',
  created_at timestamptz not null default now()
);

create index if not exists crews_org_id_idx on crews (org_id);

create table if not exists crew_members (
  crew_id   text not null references crews (id) on delete cascade,
  worker_id text not null,
  primary key (crew_id, worker_id)
);
