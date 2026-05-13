-- Backfill: org_users was created via Supabase dashboard SQL during the
-- 2026-05-02 auth-user-management plan execution, but the migration file
-- was never committed. RLS policies across many later migrations reference
-- this table, so git replay would fail without it.
-- Safe to re-run against the live database (uses `if not exists`).

create table if not exists org_users (
  id         uuid        primary key default gen_random_uuid(),
  org_id     text        not null,
  auth_id    uuid        not null references auth.users (id) on delete cascade,
  email      text        not null,
  name       text        not null default '',
  role       text        not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (org_id, auth_id)
);

alter table org_users enable row level security;
